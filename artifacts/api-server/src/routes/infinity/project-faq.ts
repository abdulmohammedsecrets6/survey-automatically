import { Router, Request, Response } from "express";
import { db, projects, projectFaqs } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { buildProjectContextByProjectId } from "../../lib/project-context";
import { pooledClient } from "../../lib/llm-client";
import { logActivity } from "./project-activity";

const router = Router();

/**
 * POST /api/infinity/projects/:projectId/faq/generate
 *
 * Generates an AI-powered FAQ for the project (8-12 Q&A pairs).
 * Uses full project context (all 6 sources) to create relevant questions
 * covering goals, stack, decisions, risks, next steps, etc.
 *
 * Body: { forceRegenerate?: boolean }
 * Response: { faq: [{ q: string, a: string, sources: string[] }] }
 */
router.post("/projects/:projectId/faq/generate", async (req: Request, res: Response) => {
  const projectId = Array.isArray(req.params.projectId) ? req.params.projectId[0] : req.params.projectId;
  const { forceRegenerate } = req.body as { forceRegenerate?: boolean };

  // Verify project exists
  const [project] = await db.select({ id: projects.id, name: projects.name }).from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  // Check for existing FAQ unless forceRegenerate
  if (!forceRegenerate) {
    const [existing] = await db.select().from(projectFaqs).where(eq(projectFaqs.projectId, projectId)).orderBy(desc(projectFaqs.createdAt)).limit(1);
    if (existing) {
      res.json({ faq: existing.faq, cached: true });
      return;
    }
  }

  try {
    // Build full project context for FAQ generation
    const context = await buildProjectContextByProjectId(projectId, "Generate a comprehensive FAQ for this project covering goals, tech stack, key decisions, risks, and next steps.");

    if (!context) {
      res.status(500).json({ error: "Could not build project context" });
      return;
    }

    // System prompt for FAQ generation
    const systemPrompt = `You are an expert technical writer creating a comprehensive FAQ for the project "${context.projectName}".
Generate 8-12 question-and-answer pairs that cover the most important aspects of this project.
Categories to cover (choose the most relevant based on context):
- Project goals & purpose
- Tech stack & architecture
- Key decisions & rationale
- Current status & progress
- Risks & challenges
- Next steps & roadmap
- Team & collaboration
- Deployment & operations

Use ONLY the provided project context. Do not hallucinate or use external knowledge.
For each answer, cite your sources using format: [memory:...], [file:...], [research:...], [conversation:...], [instruction:...]
Return ONLY valid JSON in this exact format:
{
  "faq": [
    {"q": "Question text", "a": "Answer text with [source:...] citations", "sources": ["source1", "source2"]},
    ...
  ]
}`;

    const client = pooledClient();
    const completion = await client.chat.completions.create({
      model: "openai/gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Generate the project FAQ now." },
      ],
      temperature: 0.3,
      max_tokens: 3000,
      response_format: { type: "json_object" },
    });

    const resultText = completion.choices[0]?.message?.content ?? "{}";
    let parsed: { faq: Array<{ q: string; a: string; sources: string[] }> };

    try {
      parsed = JSON.parse(resultText);
    } catch {
      // Fallback: if JSON parsing fails, wrap in expected structure
      parsed = { faq: [{ q: "Could not parse FAQ", a: resultText, sources: [] }] };
    }

    // Validate and clean FAQ structure
    const cleanedFaq = (parsed.faq ?? []).slice(0, 12).map((item) => ({
      q: String(item?.q ?? "").trim(),
      a: String(item?.a ?? "").trim(),
      sources: Array.isArray(item?.sources) ? item.sources.map(String) : [],
    })).filter((item) => item.q && item.a);

    if (cleanedFaq.length === 0) {
      res.status(500).json({ error: "LLM returned empty FAQ" });
      return;
    }

    // Store FAQ in database
    await db.insert(projectFaqs).values({
      projectId,
      faq: cleanedFaq,
    });

    // Log activity
    await logActivity(projectId, "faq_generated", `Generated FAQ with ${cleanedFaq.length} Q&A pairs`);

    res.json({ faq: cleanedFaq, cached: false });
  } catch (err) {
    console.error({ err, projectId }, "Project FAQ generation error");
    res.status(500).json({ error: err instanceof Error ? err.message : "Unknown error" });
  }
});

/**
 * GET /api/infinity/projects/:projectId/faq
 *
 * Returns the cached FAQ for the project, if any.
 * Response: { faq: [{ q, a, sources[] }] | null, cached: true }
 */
router.get("/projects/:projectId/faq", async (req: Request, res: Response) => {
  const projectId = Array.isArray(req.params.projectId) ? req.params.projectId[0] : req.params.projectId;

  const [existing] = await db.select().from(projectFaqs).where(eq(projectFaqs.projectId, projectId)).orderBy(desc(projectFaqs.createdAt)).limit(1);

  if (!existing) {
    res.json({ faq: null, cached: true });
    return;
  }

  res.json({ faq: existing.faq, cached: true });
});

export default router;