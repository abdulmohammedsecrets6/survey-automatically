import { Router, Request, Response } from "express";
import { db, projectChats, projects, conversations } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { buildProjectContextByProjectId } from "../../lib/project-context";
import { pooledClient } from "../../lib/llm-client";
import { logActivity } from "./project-activity";

const router = Router();

/**
 * POST /api/infinity/projects/:projectId/chatbot
 *
 * Read-only conversational assistant with access to all project context.
 * Streams SSE responses with citation chips linking to sources.
 *
 * Body: { message: string }
 * Response: SSE stream of { type: "token" | "sources" | "error", content: string }
 */
router.post("/projects/:projectId/chatbot", async (req: Request, res: Response) => {
  const projectId = Array.isArray(req.params.projectId) ? req.params.projectId[0] : req.params.projectId;
  const { message } = req.body as { message?: string };

  if (!message || typeof message !== "string") {
    res.status(400).json({ error: "Missing or invalid 'message' in body" });
    return;
  }

  // Verify project exists
  const [project] = await db.select({ id: projects.id, name: projects.name }).from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  // Set up SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const send = (data: unknown) => {
    try {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch {
      // Client disconnected
    }
  };

  const sendError = (msg: string) => {
    send({ type: "error", message: msg });
    send("data: [DONE]\n\n");
    res.end();
  };

  try {
    // Build full project context (all 6 sources) for the user's question
    const context = await buildProjectContextByProjectId(projectId, message);

    if (!context) {
      sendError("Could not build project context");
      return;
    }

    // System prompt for read-only project assistant
    const systemPrompt = `You are a read-only assistant for the project "${context.projectName}".
Answer questions ONLY from the provided project context below. Do not use external knowledge.
Always cite your sources when answering. Use citation format like [memory:...], [file:...], [research:...], [conversation:...].
If the answer is not in the context, say you don't know based on the available project information.

${context.prompt}`;

    // Stream the LLM response
    const client = pooledClient();
    const stream = await client.chat.completions.create({
      model: "openai/gpt-4o-mini", // Temperature 0.3 for more deterministic answers
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
      temperature: 0.3,
      max_tokens: 2000,
      stream: true,
    });

    let fullText = "";
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content ?? "";
      if (delta) {
        fullText += delta;
        send({ type: "token", content: delta });
      }
    }

    // Extract sources from the response (simple regex for citation patterns)
    const sourceMatches = fullText.match(/\[(memory|file|research|conversation):([^\]]+)\]/g);
    if (sourceMatches && sourceMatches.length > 0) {
      const sources = [...new Set(sourceMatches)]; // Deduplicate
      send({ type: "sources", content: sources });
    }

    // Log the chatbot interaction as activity
    await logActivity(projectId, "agent_ran", `Chatbot answered: "${message.slice(0, 80)}..."`);

    send("data: [DONE]\n\n");
    res.end();
  } catch (err) {
    console.error({ err, projectId }, "Project chatbot error");
    sendError(err instanceof Error ? err.message : "Unknown error");
  }
});

export default router;