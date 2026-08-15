/**
 * Project Connectors API (Phase 5).
 *
 *  GET    /api/infinity/projects/:id/connectors        list all connectors for project
 *  POST   /api/infinity/projects/:id/connectors        create/upsert a connector (OAuth initiation or token storage)
 *  GET    /api/infinity/projects/:id/connectors/:connectorId  get connector details
 *  PATCH  /api/infinity/projects/:id/connectors/:connectorId  update connector (config, displayName)
 *  DELETE /api/infinity/projects/:id/connectors/:connectorId  delete connector
 *  POST   /api/infinity/projects/:id/connectors/:connectorId/sync  trigger manual sync
 *  GET    /api/infinity/projects/:id/connectors/:connectorId/status  get connection status
 *
 * Supported providers: github, google_drive, figma, canva, google_calendar
 * OAuth flows are provider-specific; this route handles token storage + status.
 */
import { Router, Request, Response } from "express";
import { db, projectConnectors, projects } from "@workspace/db";
import { eq, and, or, isNull, gt, desc } from "drizzle-orm";
import { cleanText } from "../../lib/text-utils";
import { logActivity } from "./project-activity";

const router = Router();

const VALID_PROVIDERS = ["github", "google_drive", "figma", "canva", "google_calendar"] as const;
type Provider = (typeof VALID_PROVIDERS)[number];

async function resolveProject(projectId: string) {
  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  return project ? { id: projectId } : null;
}

/** GET /api/infinity/projects/:id/connectors — list all connectors */
router.get("/projects/:id/connectors", async (req, res) => {
  const projectId = cleanText(req.params.id, 80);
  try {
    const project = await resolveProject(projectId);
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    const rows = await db
      .select()
      .from(projectConnectors)
      .where(eq(projectConnectors.projectId, projectId))
      .orderBy(desc(projectConnectors.createdAt));

    // Don't expose tokens in list
    res.json({
      connectors: rows.map((r) => ({
        id: r.id,
        provider: r.provider,
        displayName: r.displayName,
        config: r.config,
        status: r.status,
        error: r.error,
        lastSyncAt: r.lastSyncAt?.toISOString() ?? null,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
        hasTokens: Boolean(r.accessToken || r.refreshToken),
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to list project connectors");
    res.status(500).json({ error: "Failed to list connectors" });
  }
});

/** POST /api/infinity/projects/:id/connectors — create or upsert a connector */
router.post("/projects/:id/connectors", async (req, res) => {
  const projectId = cleanText(req.params.id, 80);
  const { provider, displayName, config, accessToken, refreshToken, expiresAt } = req.body as {
    provider: string;
    displayName?: string;
    config?: Record<string, unknown>;
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
  };

  if (!VALID_PROVIDERS.includes(provider as Provider)) {
    res.status(400).json({ error: `Invalid provider. Must be one of: ${VALID_PROVIDERS.join(", ")}` });
    return;
  }

  try {
    const project = await resolveProject(projectId);
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    // Upsert: one connector per provider per project
    const [existing] = await db
      .select()
      .from(projectConnectors)
      .where(and(eq(projectConnectors.projectId, projectId), eq(projectConnectors.provider, provider as Provider)))
      .limit(1);

    let connector;
    if (existing) {
      const [updated] = await db
        .update(projectConnectors)
        .set({
          displayName: displayName ?? existing.displayName,
          config: config ?? existing.config,
          accessToken: accessToken ?? existing.accessToken,
          refreshToken: refreshToken ?? existing.refreshToken,
          expiresAt: expiresAt ?? existing.expiresAt,
          status: accessToken || refreshToken ? "connected" : existing.status,
          error: accessToken || refreshToken ? null : existing.error,
          updatedAt: new Date(),
        })
        .where(eq(projectConnectors.id, existing.id))
        .returning();
      connector = updated;
    } else {
      const [created] = await db
        .insert(projectConnectors)
        .values({
          projectId,
          provider: provider as Provider,
          displayName,
          config: config ?? {},
          accessToken,
          refreshToken,
          expiresAt,
          status: accessToken || refreshToken ? "connected" : "disconnected",
        })
        .returning();
      connector = created;
    }

    await logActivity(projectId, existing ? "connector_updated" : "connector_created", `Connector ${connector.provider} ${existing ? "updated" : "created"}`);

    res.json({
      id: connector.id,
      provider: connector.provider,
      displayName: connector.displayName,
      config: connector.config,
      status: connector.status,
      error: connector.error,
      lastSyncAt: connector.lastSyncAt?.toISOString() ?? null,
      createdAt: connector.createdAt.toISOString(),
      updatedAt: connector.updatedAt.toISOString(),
      hasTokens: Boolean(connector.accessToken || connector.refreshToken),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to create/update project connector");
    res.status(500).json({ error: "Failed to create connector" });
  }
});

/** GET /api/infinity/projects/:id/connectors/:connectorId — get connector details */
router.get("/projects/:id/connectors/:connectorId", async (req, res) => {
  const projectId = cleanText(req.params.id, 80);
  const connectorId = cleanText(req.params.connectorId, 80);
  try {
    const project = await resolveProject(projectId);
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    const [connector] = await db
      .select()
      .from(projectConnectors)
      .where(and(eq(projectConnectors.projectId, projectId), eq(projectConnectors.id, connectorId)))
      .limit(1);

    if (!connector) {
      res.status(404).json({ error: "Connector not found" });
      return;
    }

    // Return with tokens masked
    res.json({
      id: connector.id,
      provider: connector.provider,
      displayName: connector.displayName,
      config: connector.config,
      status: connector.status,
      error: connector.error,
      lastSyncAt: connector.lastSyncAt?.toISOString() ?? null,
      createdAt: connector.createdAt.toISOString(),
      updatedAt: connector.updatedAt.toISOString(),
      hasTokens: Boolean(connector.accessToken || connector.refreshToken),
      // For debugging: show if tokens exist (never expose actual tokens)
      accessTokenPreview: connector.accessToken ? `${connector.accessToken.slice(0, 8)}...` : null,
      refreshTokenPreview: connector.refreshToken ? `${connector.refreshToken.slice(0, 8)}...` : null,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get project connector");
    res.status(500).json({ error: "Failed to get connector" });
  }
});

/** PATCH /api/infinity/projects/:id/connectors/:connectorId — update connector */
router.patch("/projects/:id/connectors/:connectorId", async (req, res) => {
  const projectId = cleanText(req.params.id, 80);
  const connectorId = cleanText(req.params.connectorId, 80);
  const { displayName, config, status, error } = req.body as {
    displayName?: string;
    config?: Record<string, unknown>;
    status?: "connected" | "disconnected" | "error" | "expired";
    error?: string;
  };

  try {
    const project = await resolveProject(projectId);
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    const [connector] = await db
      .select()
      .from(projectConnectors)
      .where(and(eq(projectConnectors.projectId, projectId), eq(projectConnectors.id, connectorId)))
      .limit(1);

    if (!connector) {
      res.status(404).json({ error: "Connector not found" });
      return;
    }

    const [updated] = await db
      .update(projectConnectors)
      .set({
        displayName: displayName ?? connector.displayName,
        config: config ?? connector.config,
        status: status ?? connector.status,
        error: error ?? connector.error,
        updatedAt: new Date(),
      })
      .where(eq(projectConnectors.id, connectorId))
      .returning();

    res.json({
      id: updated.id,
      provider: updated.provider,
      displayName: updated.displayName,
      config: updated.config,
      status: updated.status,
      error: updated.error,
      lastSyncAt: updated.lastSyncAt?.toISOString() ?? null,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      hasTokens: Boolean(updated.accessToken || updated.refreshToken),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to update project connector");
    res.status(500).json({ error: "Failed to update connector" });
  }
});

/** DELETE /api/infinity/projects/:id/connectors/:connectorId — delete connector */
router.delete("/projects/:id/connectors/:connectorId", async (req, res) => {
  const projectId = cleanText(req.params.id, 80);
  const connectorId = cleanText(req.params.connectorId, 80);
  try {
    const project = await resolveProject(projectId);
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    const [connector] = await db
      .select()
      .from(projectConnectors)
      .where(and(eq(projectConnectors.projectId, projectId), eq(projectConnectors.id, connectorId)))
      .limit(1);

    if (!connector) {
      res.status(404).json({ error: "Connector not found" });
      return;
    }

    await db.delete(projectConnectors).where(eq(projectConnectors.id, connectorId));

    await logActivity(projectId, "connector_removed", `Connector ${connector.provider} removed`);

    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete project connector");
    res.status(500).json({ error: "Failed to delete connector" });
  }
});

/** POST /api/infinity/projects/:id/connectors/:connectorId/sync — trigger manual sync */
router.post("/projects/:id/connectors/:connectorId/sync", async (req, res) => {
  const projectId = cleanText(req.params.id, 80);
  const connectorId = cleanText(req.params.connectorId, 80);
  try {
    const project = await resolveProject(projectId);
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    const [connector] = await db
      .select()
      .from(projectConnectors)
      .where(and(eq(projectConnectors.projectId, projectId), eq(projectConnectors.id, connectorId)))
      .limit(1);

    if (!connector) {
      res.status(404).json({ error: "Connector not found" });
      return;
    }

    if (!connector.accessToken) {
      res.status(400).json({ error: "Connector not connected (no access token)" });
      return;
    }

    // TODO: Implement actual sync logic per provider
    // For now, just update lastSyncAt
    await db
      .update(projectConnectors)
      .set({ lastSyncAt: new Date(), status: "connected", error: null, updatedAt: new Date() })
      .where(eq(projectConnectors.id, connectorId));

    await logActivity(projectId, "connector_sync", `Manual sync for ${connector.provider}`);

    res.json({ ok: true, message: "Sync triggered", lastSyncAt: new Date().toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to sync project connector");
    res.status(500).json({ error: "Failed to sync connector" });
  }
});

/** GET /api/infinity/projects/:id/connectors/:connectorId/status — get connection status */
router.get("/projects/:id/connectors/:connectorId/status", async (req, res) => {
  const projectId = cleanText(req.params.id, 80);
  const connectorId = cleanText(req.params.connectorId, 80);
  try {
    const project = await resolveProject(projectId);
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    const [connector] = await db
      .select()
      .from(projectConnectors)
      .where(and(eq(projectConnectors.projectId, projectId), eq(projectConnectors.id, connectorId)))
      .limit(1);

    if (!connector) {
      res.status(404).json({ error: "Connector not found" });
      return;
    }

    // Check token expiry
    let status = connector.status;
    if (connector.expiresAt && connector.expiresAt < Date.now()) {
      status = "expired";
    }

    res.json({
      connected: Boolean(connector.accessToken) && status === "connected",
      status,
      error: connector.error,
      lastSyncAt: connector.lastSyncAt?.toISOString() ?? null,
      expiresAt: connector.expiresAt ?? null,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get connector status");
    res.status(500).json({ error: "Failed to get status" });
  }
});

export default router;