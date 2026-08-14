/**
 * Project Sharing API (Phase 1.4).
 *
 *  GET    /api/infinity/projects/:id/shares          list active shares
 *  POST   /api/infinity/projects/:id/shares          create a share (body: permission, email?, expiresInDays?)
 *  DELETE /api/infinity/projects/:id/shares/:shareId  revoke a share
 *
 * All handlers resolve the project strictly by id.
 */
import { Router } from "express";
import { db, projectShares, projects } from "@workspace/db";
import { eq, and, or, isNull, gt, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import { cleanText } from "../../lib/text-utils";

const router = Router();

async function resolveProject(projectId: string) {
  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  return project ? { id: projectId } : null;
}

/** GET /api/infinity/projects/:id/shares — list active, non-expired shares */
router.get("/projects/:id/shares", async (req, res) => {
  const projectId = cleanText(req.params.id, 80);
  try {
    const project = await resolveProject(projectId);
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    const now = new Date();
    const rows = await db
      .select()
      .from(projectShares)
      .where(
        and(
          eq(projectShares.projectId, projectId),
          or(isNull(projectShares.expiresAt), gt(projectShares.expiresAt, now)),
        ),
      )
      .orderBy(desc(projectShares.createdAt));

    const valid = rows;
    res.json({
      shares: valid.map((r) => ({
        id: r.id,
        permission: r.permission,
        email: r.email ?? null,
        accessToken: r.accessToken,
        shareUrl: `/p/${r.accessToken}`,
        expiresAt: r.expiresAt ? r.expiresAt.toISOString() : null,
        createdAt: r.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to list project shares");
    res.status(500).json({ error: "Failed to list shares" });
  }
});

/** POST /api/infinity/projects/:id/shares — create a share link */
router.post("/projects/:id/shares", async (req, res) => {
  const projectId = cleanText(req.params.id, 80);
  const { permission, email, expiresInDays } = req.body as {
    permission?: string;
    email?: string;
    expiresInDays?: number;
  };

  try {
    const project = await resolveProject(projectId);
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    const perm = permission === "collaborator" ? "collaborator" : "read";
    const cleanEmail =
      typeof email === "string" && email.trim() ? email.trim().slice(0, 200) : null;

    let expiresAt: Date | null = null;
    if (typeof expiresInDays === "number" && expiresInDays > 0) {
      expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
    }

    const [share] = await db
      .insert(projectShares)
      .values({
        projectId,
        accessToken: randomUUID(),
        permission: perm,
        email: cleanEmail,
        expiresAt,
        createdBy: "owner",
      })
      .returning();

    res.json({
      id: share.id,
      permission: share.permission,
      email: share.email ?? null,
      accessToken: share.accessToken,
      shareUrl: `/p/${share.accessToken}`,
      expiresAt: share.expiresAt ? share.expiresAt.toISOString() : null,
      createdAt: share.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to create project share");
    res.status(500).json({ error: "Failed to create share" });
  }
});

/** DELETE /api/infinity/projects/:id/shares/:shareId — revoke a share */
router.delete("/projects/:id/shares/:shareId", async (req, res) => {
  const projectId = cleanText(req.params.id, 80);
  const shareId = cleanText(req.params.shareId, 80);
  try {
    const project = await resolveProject(projectId);
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    await db
      .delete(projectShares)
      .where(and(eq(projectShares.projectId, projectId), eq(projectShares.id, shareId)));
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to revoke project share");
    res.status(500).json({ error: "Failed to revoke share" });
  }
});

export default router;
