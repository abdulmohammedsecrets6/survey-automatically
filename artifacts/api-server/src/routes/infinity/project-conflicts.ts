import { Router, Request, Response } from "express";
import { db, projects, projectConflicts } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { buildProjectContextByProjectId } from "../../lib/project-context";
import { pooledClient } from "../../lib/llm-client";
import { logActivity } from "./project-activity";

const router = Router();

/**
 * POST /api/infinity/projects/:projectId/conflicts/scan
 *
 * Scans the project for contradictions across all sources (memories,
 * conversation history, research, instructions, files).
 * Uses LLM to find contradictions and stores results in projectConflicts table.
 *
 * Body: { forceRescan?: boolean }
 * Response: { conflicts: [{ id, claimA, sourceA, claimB, sourceB, severity, detectedAt }] }
 */
router.post("/projects/:projectId/conflicts/scan", async (req: Request, res: Response) => {
  const projectId = Array.isArray(req.params.projectId) ? req.params.projectId[0] : req.params.projectId;
  const { forceRescan } = req.body as { forceRescan?: boolean };

  // Verify project exists
  const [project] = await db.select({ id: projects.id, name: projects.name }).from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  // Check for existing conflicts unless forceRescan
  if (!forceRescan) {
    const existing = await db.select().from(projectConflicts).where(eq(projectConflicts.projectId, projectId)).orderBy(desc(projectConflicts.detectedAt)).limit(50);
    if (existing.length > 0) {
      res.json({ conflicts: existing, cached: true });
      return;
    }
  }

  try {
    // Build full project context for conflict detection
    const context = await buildProjectContextByProjectId(projectId, "Find contradictions across all project sources.");

    if (!context) {
      res.status(500).json({ error: "Could not build project context" });
      return;
    }

    // System prompt for conflict detection
    const systemPrompt = `You are an expert analyst reviewing the project "${context.projectName}" for internal contradictions.
Your task: find contradictions between different sources within this project.
Sources to compare: project memories, conversation history, research reports, instructions, files.

Types of contradictions to detect:
- Technical decisions (e.g., memory says PostgreSQL, chat says MongoDB)
- Project goals (e.g., instruction says "build a CLI", research says "web app")
- Architecture choices (e.g., file says "REST API", memory says "GraphQL")
- Status/progress (e.g., task says "done", chat says "blocked")
- Constraints (e.g., memory says "no external deps", file imports many)

Return ONLY valid JSON in this exact format:
{
  "conflicts": [
    {
      "claimA": "Specific claim from source A",
      "sourceA": "[memory:...] or [conversation:...] or [research:...] or [instruction:...] or [file:...]",
      "claimB": "Contradictory claim from source B",
      "sourceB": "[memory:...] or [conversation:...] or [research:...] or [instruction:...] or [file:...]",
      "severity": "high" | "medium" | "low"
    },
    ...
  ]
}

Severity guidelines:
- HIGH: Contradictory technical decisions that would break the build or cause runtime errors
- MEDIUM: Conflicting architectural choices, goals, or constraints that need resolution
- LOW: Minor inconsistencies in wording, status, or documentation

Only return contradictions you are CONFIDENT exist. Do not hallucinate.`;

    const client = pooledClient();
    const completion = await client.chat.completions.create({
      model: "openai/gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Project context:\n\n${context.prompt}\n\nFind all contradictions now.` },
      ],
      temperature: 0.2,
      max_tokens: 3000,
      response_format: { type: "json_object" },
    });

    const resultText = completion.choices[0]?.message?.content ?? "{}";
    let parsed: { conflicts: Array<{ claimA: string; sourceA: string; claimB: string; sourceB: string; severity: "high" | "medium" | "low" }> };

    try {
      parsed = JSON.parse(resultText);
    } catch {
      // Fallback: if JSON parsing fails
      parsed = { conflicts: [] };
    }

    // Validate and clean conflicts
    const cleanedConflicts = (parsed.conflicts ?? [])
      .filter((item) => item?.claimA && item?.sourceA && item?.claimB && item?.sourceB && ["high", "medium", "low"].includes(item?.severity))
      .slice(0, 50)
      .map((item) => ({
        claimA: String(item.claimA).trim(),
        sourceA: String(item.sourceA).trim(),
        claimB: String(item.claimB).trim(),
        sourceB: String(item.sourceB).trim(),
        severity: item.severity as "high" | "medium" | "low",
      }));

    // Store conflicts in database
    if (cleanedConflicts.length > 0) {
      await db.insert(projectConflicts).values(
        cleanedConflicts.map((c) => ({
          projectId,
          claimA: c.claimA,
          sourceA: c.sourceA,
          claimB: c.claimB,
          sourceB: c.sourceB,
          severity: c.severity,
          resolved: [],
        }))
      );
    }

    // Log activity
    await logActivity(projectId, "conflict_detected", `Scanned for conflicts, found ${cleanedConflicts.length} contradiction(s)`);

    res.json({ conflicts: cleanedConflicts, cached: false });
  } catch (err) {
    console.error({ err, projectId }, "Project conflict detection error");
    res.status(500).json({ error: err instanceof Error ? err.message : "Unknown error" });
  }
});

/**
 * GET /api/infinity/projects/:projectId/conflicts
 *
 * Returns all cached conflicts for the project.
 * Response: { conflicts: [...] }
 */
router.get("/projects/:projectId/conflicts", async (req: Request, res: Response) => {
  const projectId = Array.isArray(req.params.projectId) ? req.params.projectId[0] : req.params.projectId;

  const conflicts = await db.select().from(projectConflicts).where(eq(projectConflicts.projectId, projectId)).orderBy(desc(projectConflicts.detectedAt));

  res.json({ conflicts });
});

export default router;