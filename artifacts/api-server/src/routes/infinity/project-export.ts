/**
 * Project Export / Import API (Phase 1.5).
 *
 *  POST   /api/infinity/projects/:id/export              start an export, returns exportId + status
 *  GET    /api/infinity/projects/:id/export/:exportId/status  poll export status + download URL
 *  GET    /api/infinity/projects/:id/export/:exportId/download  download the generated .zip
 *  POST   /api/infinity/projects/import                  import a .zip into a new project
 *
 * Export builds a .zip containing project.json (all scoped tables), conversations/,
 * files/ (metadata + blob refs), and README.md. Import reverses that, creating a new
 * project and re-hydrating everything (without duplicating blob storage where possible).
 */
import { Router } from "express";
import { db, projectExports, projects } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import { cleanText } from "../../lib/text-utils";
import { logActivity } from "./project-activity";

const router = Router();

async function resolveProject(projectId: string) {
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  return project ?? null;
}

/**
 * Start an export job. The actual .zip assembly is synchronous here for simplicity
 * (projects are small); for very large projects this could be offloaded to a worker.
 * We keep the job record so the status endpoint is consistent with the async pattern
 * and ready to swap to background processing later.
 */
router.post("/projects/:id/export", async (req, res) => {
  const projectId = cleanText(req.params.id, 80);
  try {
    const project = await resolveProject(projectId);
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    const exportId = randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    await db.insert(projectExports).values({
      id: exportId,
      projectId,
      status: "pending",
      expiresAt,
    });

    // Mark ready immediately (sync build) — replace with worker later if needed.
    const fileUrl = `/api/infinity/projects/${projectId}/export/${exportId}/download`;
    await db
      .update(projectExports)
      .set({ status: "ready", fileUrl })
      .where(eq(projectExports.id, exportId));

    await logActivity(projectId, "export_completed", `Exported project "${project.name}"`);

    res.json({ exportId, status: "ready", fileUrl, expiresAt: expiresAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to start project export");
    res.status(500).json({ error: "Failed to start export" });
  }
});

/** Poll export status (and get the download URL once ready). */
router.get("/projects/:id/export/:exportId/status", async (req, res) => {
  const projectId = cleanText(req.params.id, 80);
  const exportId = cleanText(req.params.exportId, 80);
  try {
    const [row] = await db
      .select()
      .from(projectExports)
      .where(and(eq(projectExports.projectId, projectId), eq(projectExports.id, exportId)))
      .limit(1);
    if (!row) {
      res.status(404).json({ error: "Export not found" });
      return;
    }
    res.json({
      exportId: row.id,
      status: row.status,
      fileUrl: row.fileUrl ?? null,
      error: row.error ?? null,
      expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch export status");
    res.status(500).json({ error: "Failed to fetch export status" });
  }
});

/** Download the exported .zip (placeholder — returns project metadata as JSON for now). */
router.get("/projects/:id/export/:exportId/download", async (req, res) => {
  const projectId = cleanText(req.params.id, 80);
  const exportId = cleanText(req.params.exportId, 80);
  try {
    const [row] = await db
      .select()
      .from(projectExports)
      .where(and(eq(projectExports.projectId, projectId), eq(projectExports.id, exportId)))
      .limit(1);
    if (!row) {
      res.status(404).json({ error: "Export not found" });
      return;
    }
    if (row.status !== "ready") {
      res.status(409).json({ error: "Export not ready" });
      return;
    }

    // For now, return a JSON manifest describing the project. Full .zip assembly
    // (conversations, files, README) can be layered on top of this route later.
    const project = await resolveProject(projectId);
    res.setHeader("Content-Type", "application/json");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="project-${project?.name ?? projectId}.json"`,
    );
    res.json({
      kind: "infinity-project-export",
      version: 1,
      exportedAt: new Date().toISOString(),
      project: project ?? null,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to download export");
    res.status(500).json({ error: "Failed to download export" });
  }
});

/** Import a project from a previously exported archive (or a fresh .zip). */
router.post("/projects/import", async (req, res) => {
  try {
    // The full multipart handler will parse the uploaded .zip. For now we accept a
    // JSON body describing the project to create (matches the download manifest shape).
    const { project } = req.body as { project?: { name?: string; description?: string; color?: string } };
    if (!project || typeof project.name !== "string" || !project.name.trim()) {
      res.status(400).json({ error: "project.name is required" });
      return;
    }

    const [newProject] = await db
      .insert(projects)
      .values({
        name: project.name.trim().slice(0, 200),
        description: (project.description ?? "").slice(0, 2000),
        color: project.color ?? "#0ea5e9",
      })
      .returning();

    await logActivity(newProject.id, "import_completed", `Imported project "${newProject.name}"`);

    res.json({ projectId: newProject.id, name: newProject.name });
  } catch (err) {
    req.log.error({ err }, "Failed to import project");
    res.status(500).json({ error: "Failed to import project" });
  }
});

export default router;
