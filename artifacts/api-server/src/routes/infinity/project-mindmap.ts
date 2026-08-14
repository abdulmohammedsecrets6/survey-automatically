import { Router, Request, Response } from "express";
import { db, projects, projectConnections, projectMemories, projectInstructions, projectTasks, projectResearch, projectResearchFindings, projectFiles } from "@workspace/db";
import { eq, desc, inArray, and } from "drizzle-orm";
import { buildProjectContextByProjectId } from "../../lib/project-context";
import { pooledClient } from "../../lib/llm-client";
import { logActivity } from "./project-activity";

const router = Router();

/**
 * POST /api/infinity/projects/:projectId/mindmap/infer
 *
 * Infers relationships between all project entities using LLM.
 * Loads all files, memories, instructions, tasks, and research findings.
 * Prompts LLM to extract pairwise relationships and upserts into project_connections.
 *
 * Body: { forceRegenerate?: boolean }
 * Response: { connections: ProjectConnection[], inferred: number }
 */
router.post("/projects/:projectId/mindmap/infer", async (req: Request, res: Response) => {
  const projectId = Array.isArray(req.params.projectId) ? req.params.projectId[0] : req.params.projectId;
  const { forceRegenerate } = req.body as { forceRegenerate?: boolean };

  // Verify project exists
  const [project] = await db.select({ id: projects.id, name: projects.name }).from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  // Check for existing connections unless forceRegenerate
  if (!forceRegenerate) {
    const existing = await db.select().from(projectConnections).where(eq(projectConnections.projectId, projectId));
    if (existing.length > 0) {
      res.json({ connections: existing, inferred: 0, cached: true });
      return;
    }
  }

  try {
    // Load all project entities for relationship inference
    const [memories, instructions, tasks, researchFindings, files] = await Promise.all([
      db.select().from(projectMemories).where(eq(projectMemories.projectId, projectId)),
      db.select().from(projectInstructions).where(eq(projectInstructions.projectId, projectId)),
      db.select().from(projectTasks).where(eq(projectTasks.projectId, projectId)),
      db.select().from(projectResearch).where(eq(projectResearch.projectId, projectId)),
      db.select().from(projectFiles).where(eq(projectFiles.projectId, projectId)),
    ]);

    // Build context summary for LLM
    const entitySummary = buildEntitySummary(memories, instructions, tasks, researchFindings, files);

    if (!entitySummary.trim()) {
      res.json({ connections: [], inferred: 0, message: "No entities to analyze" });
      return;
    }

    // System prompt for connection inference
    const systemPrompt = `You are an expert software architect analyzing the project "${project.name}".
Analyze all project entities and identify meaningful relationships between them.

Entity types:
- file: source code, docs, configs
- memory: learned facts about the project
- instruction: explicit project rules/guidelines
- task: to-do items
- research: saved research findings

Relationship types:
- references: A explicitly mentions or links to B
- supports: A provides evidence/backing for B
- contradicts: A states something that contradicts B
- depends_on: A requires B to work/be understood

Return ONLY valid JSON in this exact format:
{
  "connections": [
    {
      "nodeAType": "file|memory|instruction|task|research",
      "nodeAId": "entity-id",
      "nodeBType": "file|memory|instruction|task|research",
      "nodeBId": "entity-id",
      "relationship": "references|supports|contradicts|depends_on",
      "confidence": 0.0-1.0,
      "explanation": "Why this relationship exists (1-2 sentences)"
    },
    ...
  ]
}

Rules:
- Only return relationships with confidence >= 0.6
- Maximum 50 connections
- No self-references (nodeAId !== nodeBId)
- No duplicate relationships between same pair with same type
- Use ONLY the provided entity data`;

    const client = pooledClient();
    const completion = await client.chat.completions.create({
      model: "openai/gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Analyze these project entities and infer connections:\n\n${entitySummary}` },
      ],
      temperature: 0.2,
      max_tokens: 4000,
      response_format: { type: "json_object" },
    });

    const resultText = completion.choices[0]?.message?.content ?? "{}";
    let parsed: { connections: Array<{
      nodeAType: string;
      nodeAId: string;
      nodeBType: string;
      nodeBId: string;
      relationship: string;
      confidence: number;
      explanation?: string;
    }> };

    try {
      parsed = JSON.parse(resultText);
    } catch {
      res.json({ connections: [], inferred: 0, error: "Failed to parse LLM response" });
      return;
    }

    // Validate and clean connections
    const validTypes = ["file", "memory", "instruction", "task", "research"] as const;
    const validRelationships = ["references", "supports", "contradicts", "depends_on"] as const;

    const cleanedConnections = (parsed.connections ?? [])
      .filter((c) =>
        validTypes.includes(c.nodeAType as any) &&
        validTypes.includes(c.nodeBType as any) &&
        validRelationships.includes(c.relationship as any) &&
        typeof c.confidence === "number" &&
        c.confidence >= 0.6 &&
        c.nodeAId !== c.nodeBId
      )
      .slice(0, 50)
      .map((c) => ({
        projectId,
        nodeAType: c.nodeAType,
        nodeAId: c.nodeAId,
        nodeBType: c.nodeBType,
        nodeBId: c.nodeBId,
        relationship: c.relationship,
        confidence: c.confidence,
        explanation: c.explanation?.slice(0, 500) ?? null,
      }));

    if (cleanedConnections.length === 0) {
      res.json({ connections: [], inferred: 0, message: "No valid connections found" });
      return;
    }

    // Upsert connections (delete existing for this project, insert new)
    await db.delete(projectConnections).where(eq(projectConnections.projectId, projectId));
    await db.insert(projectConnections).values(cleanedConnections as any);

    // Log activity
    await logActivity(projectId, "mindmap_inferred", `Inferred ${cleanedConnections.length} connections for mindmap`);

    res.json({ connections: cleanedConnections, inferred: cleanedConnections.length, cached: false });
  } catch (err) {
    console.error({ err, projectId }, "Project mindmap inference error");
    res.status(500).json({ error: err instanceof Error ? err.message : "Unknown error" });
  }
});

/**
 * GET /api/infinity/projects/:projectId/mindmap
 *
 * Returns the mindmap graph (nodes + edges) for rendering.
 * Builds nodes from all project entities and edges from project_connections.
 *
 * Response: { nodes: MindmapNode[], edges: MindmapEdge[] }
 */
router.get("/projects/:projectId/mindmap", async (req: Request, res: Response) => {
  const projectId = Array.isArray(req.params.projectId) ? req.params.projectId[0] : req.params.projectId;

  // Verify project exists
  const [project] = await db.select({ id: projects.id, name: projects.name }).from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  try {
    // Load all connections
    const connections = await db.select().from(projectConnections).where(eq(projectConnections.projectId, projectId));

    if (connections.length === 0) {
      res.json({ nodes: [], edges: [] });
      return;
    }

    // Collect all unique node IDs by type
    const nodeIdsByType = new Map<string, Set<string>>();
    for (const conn of connections) {
      if (!nodeIdsByType.has(conn.nodeAType)) nodeIdsByType.set(conn.nodeAType, new Set());
      if (!nodeIdsByType.has(conn.nodeBType)) nodeIdsByType.set(conn.nodeBType, new Set());
      nodeIdsByType.get(conn.nodeAType)!.add(conn.nodeAId);
      nodeIdsByType.get(conn.nodeBType)!.add(conn.nodeBId);
    }

    // Load entity details for labels
    const nodes = await loadNodeLabels(projectId, nodeIdsByType);

    // Build edges
    const edges = connections.map((conn) => ({
      id: `${conn.nodeAType}:${conn.nodeAId}-${conn.nodeBType}:${conn.nodeBId}-${conn.relationship}`,
      source: `${conn.nodeAType}:${conn.nodeAId}`,
      target: `${conn.nodeBType}:${conn.nodeBId}`,
      relationship: conn.relationship,
      confidence: conn.confidence,
      explanation: conn.explanation ?? undefined,
    }));

    res.json({ nodes, edges });
  } catch (err) {
    console.error({ err, projectId }, "Project mindmap fetch error");
    res.status(500).json({ error: err instanceof Error ? err.message : "Unknown error" });
  }
});

/**
 * POST /api/infinity/projects/:projectId/mindmap/explain
 *
 * Returns an LLM explanation for a specific connection between two nodes.
 *
 * Body: { nodeA: { type, id }, nodeB: { type, id } }
 * Response: { explanation: string, citations: string[] }
 */
router.post("/projects/:projectId/mindmap/explain", async (req: Request, res: Response) => {
  const projectId = Array.isArray(req.params.projectId) ? req.params.projectId[0] : req.params.projectId;
  const { nodeA, nodeB } = req.body as {
    nodeA: { type: string; id: string };
    nodeB: { type: string; id: string };
  };

  if (!nodeA?.type || !nodeA?.id || !nodeB?.type || !nodeB?.id) {
    res.status(400).json({ error: "nodeA and nodeB with type and id are required" });
    return;
  }

  // Fetch project name for the system prompt
  const [project] = await db.select({ id: projects.id, name: projects.name }).from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  try {
    // Load the two entities
    const [entityA, entityB] = await Promise.all([
      loadEntity(projectId, nodeA.type, nodeA.id),
      loadEntity(projectId, nodeB.type, nodeB.id),
    ]);

    if (!entityA || !entityB) {
      res.status(404).json({ error: "One or both entities not found" });
      return;
    }

    // Build context for explanation
    const context = `Entity A (${nodeA.type}:${nodeA.id}): ${formatEntityForExplanation(entityA, nodeA.type)}
Entity B (${nodeB.type}:${nodeB.id}): ${formatEntityForExplanation(entityB, nodeB.type)}`;

    // Check if there's a stored connection with explanation
    const [storedConnection] = await db.select()
      .from(projectConnections)
      .where(
        and(
          eq(projectConnections.projectId, projectId),
          eq(projectConnections.nodeAType, nodeA.type as typeof projectConnections.$inferSelect.nodeAType),
          eq(projectConnections.nodeAId, nodeA.id),
          eq(projectConnections.nodeBType, nodeB.type as typeof projectConnections.$inferSelect.nodeBType),
          eq(projectConnections.nodeBId, nodeB.id),
        )
      )
      .limit(1);

    let explanation = storedConnection?.explanation;
    let citations: string[] = [];

    if (!explanation) {
      // Generate explanation via LLM
      const systemPrompt = `You are explaining the relationship between two entities in the project "${project.name}".
Entity A and Entity B have been identified as connected. Explain WHY they are related in 2-3 sentences.
Focus on the semantic relationship, not just that they exist.
Return ONLY valid JSON: { "explanation": "...", "citations": ["source1", "source2"] }`;

      const client = pooledClient();
      const completion = await client.chat.completions.create({
        model: "openai/gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: context },
        ],
        temperature: 0.3,
        max_tokens: 500,
        response_format: { type: "json_object" },
      });

      const resultText = completion.choices[0]?.message?.content ?? "{}";
      try {
        const parsed = JSON.parse(resultText);
        explanation = parsed.explanation;
        citations = Array.isArray(parsed.citations) ? parsed.citations : [];
      } catch {
        explanation = "Could not generate explanation.";
        citations = [];
      }
    }

    res.json({ explanation: explanation ?? "No explanation available.", citations });
  } catch (err) {
    console.error({ err, projectId }, "Project mindmap explain error");
    res.status(500).json({ error: err instanceof Error ? err.message : "Unknown error" });
  }
});

/** Build a summary of all entities for the LLM to analyze */
function buildEntitySummary(
  memories: any[],
  instructions: any[],
  tasks: any[],
  researchFindings: any[],
  files: any[],
): string {
  const sections: string[] = [];

  if (memories.length > 0) {
    sections.push("=== MEMORIES ===");
    for (const m of memories.slice(0, 30)) {
      sections.push(`[memory:${m.id}] ${m.category}: ${m.content.slice(0, 200)}`);
    }
  }

  if (instructions.length > 0) {
    sections.push("\n=== INSTRUCTIONS ===");
    for (const i of instructions.slice(0, 20)) {
      sections.push(`[instruction:${i.id}] ${i.text.slice(0, 200)}`);
    }
  }

  if (tasks.length > 0) {
    sections.push("\n=== TASKS ===");
    for (const t of tasks.slice(0, 20)) {
      sections.push(`[task:${t.id}] ${t.title} (${t.status})${t.description ? `: ${t.description.slice(0, 100)}` : ""}`);
    }
  }

  if (researchFindings.length > 0) {
    sections.push("\n=== RESEARCH FINDINGS ===");
    for (const r of researchFindings.slice(0, 20)) {
      sections.push(`[research:${r.id}] ${r.excerpt.slice(0, 200)}`);
    }
  }

  if (files.length > 0) {
    sections.push("\n=== FILES ===");
    for (const f of files.slice(0, 30)) {
      sections.push(`[file:${f.id}] ${f.name}`);
    }
  }

  return sections.join("\n");
}

/** Load human-readable labels for all nodes */
async function loadNodeLabels(
  projectId: string,
  nodeIdsByType: Map<string, Set<string>>,
): Promise<Array<{ id: string; type: string; label: string; data?: Record<string, unknown> }>> {
  const nodes: Array<{ id: string; type: string; label: string; data?: Record<string, unknown> }> = [];

  // Load memories
  const memoryIds = nodeIdsByType.get("memory");
  if (memoryIds && memoryIds.size > 0) {
    const memories = await db.select({ id: projectMemories.id, category: projectMemories.category, content: projectMemories.content })
      .from(projectMemories)
      .where(inArray(projectMemories.id, Array.from(memoryIds)));
    for (const m of memories) {
      nodes.push({
        id: `memory:${m.id}`,
        type: "memory",
        label: `${m.category}: ${m.content.slice(0, 60)}…`,
        data: { category: m.category, fullContent: m.content },
      });
    }
  }

  // Load instructions
  const instructionIds = nodeIdsByType.get("instruction");
  if (instructionIds && instructionIds.size > 0) {
    const instructions = await db.select({ id: projectInstructions.id, text: projectInstructions.text })
      .from(projectInstructions)
      .where(inArray(projectInstructions.id, Array.from(instructionIds)));
    for (const i of instructions) {
      nodes.push({
        id: `instruction:${i.id}`,
        type: "instruction",
        label: `Instruction: ${i.text.slice(0, 60)}…`,
        data: { fullText: i.text },
      });
    }
  }

  // Load tasks
  const taskIds = nodeIdsByType.get("task");
  if (taskIds && taskIds.size > 0) {
    const tasks = await db.select({ id: projectTasks.id, title: projectTasks.title, status: projectTasks.status })
      .from(projectTasks)
      .where(inArray(projectTasks.id, Array.from(taskIds)));
    for (const t of tasks) {
      nodes.push({
        id: `task:${t.id}`,
        type: "task",
        label: `${t.title} (${t.status})`,
        data: { status: t.status },
      });
    }
  }

  // Load research findings
  const researchIds = nodeIdsByType.get("research");
  if (researchIds && researchIds.size > 0) {
    const research = await db.select({ id: projectResearchFindings.id, excerpt: projectResearchFindings.excerpt })
      .from(projectResearchFindings)
      .where(inArray(projectResearchFindings.id, Array.from(researchIds)));
    for (const r of research) {
      nodes.push({
        id: `research:${r.id}`,
        type: "research",
        label: `Research: ${r.excerpt.slice(0, 60)}…`,
        data: { excerpt: r.excerpt },
      });
    }
  }

  // Load files
  const fileIds = nodeIdsByType.get("file");
  if (fileIds && fileIds.size > 0) {
    const files = await db.select({ id: projectFiles.id, name: projectFiles.name })
      .from(projectFiles)
      .where(inArray(projectFiles.id, Array.from(fileIds)));
    for (const f of files) {
      nodes.push({
        id: `file:${f.id}`,
        type: "file",
        label: f.name,
        data: { fileName: f.name },
      });
    }
  }

  return nodes;
}

/** Load a single entity by type and ID */
async function loadEntity(projectId: string, type: string, id: string): Promise<any | null> {
  switch (type) {
    case "memory":
      return db.select().from(projectMemories).where(and(eq(projectMemories.id, id), eq(projectMemories.projectId, projectId))).limit(1).then((r) => r[0] ?? null);
    case "instruction":
      return db.select().from(projectInstructions).where(and(eq(projectInstructions.id, id), eq(projectInstructions.projectId, projectId))).limit(1).then((r) => r[0] ?? null);
    case "task":
      return db.select().from(projectTasks).where(and(eq(projectTasks.id, id), eq(projectTasks.projectId, projectId))).limit(1).then((r) => r[0] ?? null);
    case "research":
      return db.select().from(projectResearchFindings).where(and(eq(projectResearchFindings.id, id), eq(projectResearchFindings.projectId, projectId))).limit(1).then((r) => r[0] ?? null);
    case "file":
      return db.select().from(projectFiles).where(and(eq(projectFiles.id, id), eq(projectFiles.projectId, projectId))).limit(1).then((r) => r[0] ?? null);
    default:
      return null;
  }
}

/** Format entity for explanation prompt */
function formatEntityForExplanation(entity: any, type: string): string {
  switch (type) {
    case "memory":
      return `[${entity.category}] ${entity.content}`;
    case "instruction":
      return entity.text;
    case "task":
      return `${entity.title} (${entity.status})${entity.description ? `: ${entity.description}` : ""}`;
    case "research":
      return entity.excerpt;
    case "file":
      return `File: ${entity.name}`;
    default:
      return "Unknown entity";
  }
}

export default router;