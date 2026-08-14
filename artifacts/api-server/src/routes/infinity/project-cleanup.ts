import { Router, Request, Response } from "express";
import { db, projects, projectFiles, projectMemories, projectChats, messages, projectConflicts, files } from "@workspace/db";
import { eq, desc, and, sql, inArray, gte, lt, isNull, isNotNull } from "drizzle-orm";
import { logActivity } from "./project-activity";
import { getStorage } from "../../lib/storage";
import crypto from "crypto";

const router = Router();

/**
 * POST /api/infinity/projects/:projectId/cleanup/scan
 *
 * Scans the project for hygiene issues:
 * - duplicate files (hash compare)
 * - outdated memories (older than 30 days, not pinned, low access)
 * - unresolved questions (conversation turns ending in ? without follow-up)
 * - contradictory decisions (from conflict table)
 *
 * Body: { forceRegenerate?: boolean }
 * Response: { duplicates[], outdatedMemories[], openQuestions[], contradictions[] }
 */
router.post("/projects/:projectId/cleanup/scan", async (req: Request, res: Response) => {
  const projectId = Array.isArray(req.params.projectId) ? req.params.projectId[0] : req.params.projectId;

  // Verify project exists
  const [project] = await db.select({ id: projects.id, name: projects.name }).from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  try {
    // Run all scans in parallel
    const [duplicates, outdatedMemories, openQuestions, contradictions] = await Promise.all([
      scanDuplicateFiles(projectId),
      scanOutdatedMemories(projectId),
      scanUnresolvedQuestions(projectId),
      scanContradictions(projectId),
    ]);

    // Log activity
    await logActivity(projectId, "cleanup_ran", `Cleanup scan completed: ${duplicates.length} duplicates, ${outdatedMemories.length} outdated memories, ${openQuestions.length} open questions, ${contradictions.length} contradictions`);

    res.json({
      duplicates,
      outdatedMemories,
      openQuestions,
      contradictions,
    });
  } catch (err) {
    console.error({ err, projectId }, "Project cleanup scan error");
    res.status(500).json({ error: err instanceof Error ? err.message : "Unknown error" });
  }
});

/**
 * Scan for duplicate files by comparing content hashes
 */
async function scanDuplicateFiles(projectId: string) {
  // Get all project files with their storage keys
  const projectFileRows = await db
    .select({ id: projectFiles.id, fileId: projectFiles.fileId, name: projectFiles.name })
    .from(projectFiles)
    .where(eq(projectFiles.projectId, projectId));

  if (projectFileRows.length < 2) return [];

  // Get file metadata from files database
  const fileIds = projectFileRows.map(r => r.fileId);
  const fileMetadata = await db
    .select({ id: files.id, storageKey: files.storageKey, size: files.size, mime: files.mime })
    .from(files)
    .where(inArray(files.id, fileIds));

  const metaById = new Map(fileMetadata.map(f => [f.id, f]));
  const storage = getStorage();

  // Compute hashes for each file
  const fileHashes = new Map<string, Array<{ projectFileId: string; name: string; fileId: string; hash: string }>>();

  for (const pf of projectFileRows) {
    const meta = metaById.get(pf.fileId);
    if (!meta?.storageKey) continue;

    try {
      const blob = await storage.get(meta.storageKey);
      if (!blob) continue;

      const hash = crypto.createHash("sha256").update(blob.data).digest("hex");
      const existing = fileHashes.get(hash) || [];
      existing.push({
        projectFileId: pf.id,
        name: pf.name,
        fileId: pf.fileId,
        hash,
      });
      fileHashes.set(hash, existing);
    } catch {
      // Skip files we can't read
      continue;
    }
  }

  // Find duplicates (hashes with more than one file)
  const duplicates = [];
  for (const [hash, files] of fileHashes.entries()) {
    if (files.length > 1) {
      // Keep the first one, mark others as duplicates
      for (let i = 1; i < files.length; i++) {
        duplicates.push({
          original: {
            projectFileId: files[0].projectFileId,
            name: files[0].name,
            fileId: files[0].fileId,
          },
          duplicate: {
            projectFileId: files[i].projectFileId,
            name: files[i].name,
            fileId: files[i].fileId,
          },
          hash,
          fixAction: "dedupe",
        });
      }
    }
  }

  return duplicates;
}

/**
 * Scan for outdated memories:
 * - older than 30 days
 * - not pinned
 * - low access (we don't track access count, so we'll use createdAt + pinned)
 */
async function scanOutdatedMemories(projectId: string) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const outdated = await db
    .select({
      id: projectMemories.id,
      category: projectMemories.category,
      content: projectMemories.content,
      createdAt: projectMemories.createdAt,
      pinned: projectMemories.pinned,
    })
    .from(projectMemories)
    .where(
      and(
        eq(projectMemories.projectId, projectId),
        eq(projectMemories.pinned, false),
        lt(projectMemories.createdAt, thirtyDaysAgo),
      )
    )
    .orderBy(projectMemories.createdAt)
    .limit(50);

  return outdated.map(m => ({
    memoryId: m.id,
    category: m.category,
    content: m.content.slice(0, 200),
    createdAt: m.createdAt.toISOString(),
    ageDays: Math.floor((Date.now() - new Date(m.createdAt).getTime()) / (1000 * 60 * 60 * 24)),
    fixAction: "archive",
  }));
}

/**
 * Scan for unresolved questions:
 * Conversation turns ending in ? without a follow-up answer
 */
async function scanUnresolvedQuestions(projectId: string) {
  // Get all conversation IDs in this project
  const chatRows = await db
    .select({ conversationId: projectChats.conversationId })
    .from(projectChats)
    .where(eq(projectChats.projectId, projectId));

  if (chatRows.length === 0) return [];

  const conversationIds = chatRows.map(r => r.conversationId);

  // Get all messages from these conversations
  const allMessages = await db
    .select({
      id: messages.id,
      conversationId: messages.conversationId,
      role: messages.role,
      content: messages.content,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .where(inArray(messages.conversationId, conversationIds))
    .orderBy(messages.conversationId, messages.createdAt);

  // Group by conversation
  const byConversation = new Map<string, typeof allMessages>();
  for (const msg of allMessages) {
    const existing = byConversation.get(msg.conversationId) || [];
    existing.push(msg);
    byConversation.set(msg.conversationId, existing);
  }

  const openQuestions = [];

  for (const [conversationId, msgs] of byConversation.entries()) {
    for (let i = 0; i < msgs.length; i++) {
      const msg = msgs[i];
      // Look for user messages ending with ?
      if (msg.role === "user" && msg.content?.trim().endsWith("?")) {
        // Check if there's an assistant message after this
        const hasFollowUp = msgs.slice(i + 1).some(m => m.role === "assistant");
        if (!hasFollowUp) {
          openQuestions.push({
            conversationId,
            questionId: msg.id,
            question: msg.content.trim().slice(0, 300),
            askedAt: msg.createdAt.toISOString(),
            fixAction: "create_task",
          });
        }
      }
    }
  }

  // Limit to 20 most recent
  return openQuestions
    .sort((a, b) => new Date(b.askedAt).getTime() - new Date(a.askedAt).getTime())
    .slice(0, 20);
}

/**
 * Scan for contradictions from the conflicts table
 */
async function scanContradictions(projectId: string) {
  const conflicts = await db
    .select()
    .from(projectConflicts)
    .where(eq(projectConflicts.projectId, projectId))
    .orderBy(desc(projectConflicts.detectedAt))
    .limit(20);

  return conflicts.map(c => ({
    conflictId: c.id,
    claimA: c.claimA,
    sourceA: c.sourceA,
    claimB: c.claimB,
    sourceB: c.sourceB,
    severity: c.severity,
    detectedAt: c.detectedAt.toISOString(),
    resolved: c.resolved && c.resolved.length > 0,
    fixAction: c.resolved && c.resolved.length > 0 ? "review" : "resolve",
  }));
}

export default router;