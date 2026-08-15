/**
 * Project Automations API (Phase 5).
 *
 *  GET    /api/infinity/projects/:id/automations              list all automations
 *  POST   /api/infinity/projects/:id/automations              create automation
 *  GET    /api/infinity/projects/:id/automations/:automationId  get automation details
 *  PATCH  /api/infinity/projects/:id/automations/:automationId  update automation
 *  DELETE /api/infinity/projects/:id/automations/:automationId  delete automation
 *  POST   /api/infinity/projects/:id/automations/:automationId/run  manually trigger automation
 *  GET    /api/infinity/projects/:id/automations/:automationId/runs  list run history
 *
 * Trigger types:
 *   - cron: { type: "cron", expression: "0 9 * * 1" } (standard cron, UTC)
 *   - webhook: { type: "webhook", path: "/automation/abc123" }
 *   - manual: { type: "manual" }
 *
 * Action types:
 *   - run_agent: { type: "run_agent", prompt: "..." }
 *   - send_notification: { type: "send_notification", title: "...", body: "..." }
 *   - sync_connector: { type: "sync_connector", provider: "github" }
 *   - generate_faq: { type: "generate_faq" }
 *   - scan_conflicts: { type: "scan_conflicts" }
 *   - cleanup_project: { type: "cleanup_project" }
 */
import { Router, Request, Response } from "express";
import { db, projectAutomations, projectAutomationRuns, projects } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { cleanText } from "../../lib/text-utils";
import { logActivity } from "./project-activity";
import { randomUUID } from "crypto";

const router = Router();

const VALID_TRIGGER_TYPES = ["cron", "webhook", "manual"] as const;
const VALID_ACTION_TYPES = [
  "run_agent",
  "send_notification",
  "sync_connector",
  "generate_faq",
  "scan_conflicts",
  "cleanup_project",
] as const;

type TriggerType = (typeof VALID_TRIGGER_TYPES)[number];
type ActionType = (typeof VALID_ACTION_TYPES)[number];

async function resolveProject(projectId: string) {
  const [project] = await db
    .select({ id: projects.id, name: projects.name })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  return project ?? null;
}

/** Parse cron expression to get next run time (simple implementation) */
function getNextCronRun(expression: string): Date | null {
  // Simple cron parsing for common patterns
  // For production, use a proper cron library like 'cron-parser'
  // This is a minimal implementation for common schedules
  try {
    const parts = expression.trim().split(/\s+/);
    if (parts.length !== 5) return null;
    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
    // Very basic - just return next day at the specified hour/minute for now
    // In production, use a proper cron parser
    const now = new Date();
    const next = new Date(now);
    if (minute !== "*") next.setMinutes(parseInt(minute, 10));
    if (hour !== "*") next.setHours(parseInt(hour, 10));
    next.setSeconds(0);
    next.setMilliseconds(0);
    if (next <= now) next.setDate(next.getDate() + 1);
    return next;
  } catch {
    return null;
  }
}

/** GET /api/infinity/projects/:id/automations — list all automations */
router.get("/projects/:id/automations", async (req, res) => {
  const projectId = cleanText(req.params.id, 80);
  try {
    const project = await resolveProject(projectId);
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    const rows = await db
      .select()
      .from(projectAutomations)
      .where(eq(projectAutomations.projectId, projectId))
      .orderBy(desc(projectAutomations.createdAt));

    res.json({
      automations: rows.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        trigger: r.trigger,
        action: r.action,
        enabled: r.enabled,
        lastRunAt: r.lastRunAt?.toISOString() ?? null,
        nextRunAt: r.nextRunAt?.toISOString() ?? null,
        runCount: r.runCount,
        lastStatus: r.lastStatus,
        lastError: r.lastError,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to list project automations");
    res.status(500).json({ error: "Failed to list automations" });
  }
});

/** POST /api/infinity/projects/:id/automations — create automation */
router.post("/projects/:id/automations", async (req, res) => {
  const projectId = cleanText(req.params.id, 80);
  const { name, description, trigger, action, enabled } = req.body as {
    name: string;
    description?: string;
    trigger: { type: TriggerType; expression?: string; path?: string };
    action: { type: ActionType; [key: string]: unknown };
    enabled?: boolean;
  };

  if (!name || typeof name !== "string" || !name.trim()) {
    res.status(400).json({ error: "name is required" });
    return;
  }
  if (!trigger || !VALID_TRIGGER_TYPES.includes(trigger.type)) {
    res.status(400).json({ error: `Invalid trigger type. Must be one of: ${VALID_TRIGGER_TYPES.join(", ")}` });
    return;
  }
  if (trigger.type === "cron" && (!trigger.expression || typeof trigger.expression !== "string")) {
    res.status(400).json({ error: "cron trigger requires expression" });
    return;
  }
  if (trigger.type === "webhook" && (!trigger.path || typeof trigger.path !== "string")) {
    res.status(400).json({ error: "webhook trigger requires path" });
    return;
  }
  if (!action || !VALID_ACTION_TYPES.includes(action.type)) {
    res.status(400).json({ error: `Invalid action type. Must be one of: ${VALID_ACTION_TYPES.join(", ")}` });
    return;
  }

  try {
    const project = await resolveProject(projectId);
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    // Compute nextRunAt for cron
    let nextRunAt: Date | null = null;
    if (trigger.type === "cron" && trigger.expression) {
      nextRunAt = getNextCronRun(trigger.expression);
    }

    const [automation] = await db
      .insert(projectAutomations)
      .values({
        projectId,
        name: name.trim().slice(0, 200),
        description: description?.slice(0, 2000) ?? null,
        trigger,
        action,
        enabled: enabled ?? true,
        nextRunAt,
      })
      .returning();

    await logActivity(projectId, "automation_created", `Created automation "${automation.name}"`);

    res.json({
      id: automation.id,
      name: automation.name,
      description: automation.description,
      trigger: automation.trigger,
      action: automation.action,
      enabled: automation.enabled,
      lastRunAt: automation.lastRunAt?.toISOString() ?? null,
      nextRunAt: automation.nextRunAt?.toISOString() ?? null,
      runCount: automation.runCount,
      lastStatus: automation.lastStatus,
      lastError: automation.lastError,
      createdAt: automation.createdAt.toISOString(),
      updatedAt: automation.updatedAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to create project automation");
    res.status(500).json({ error: "Failed to create automation" });
  }
});

/** GET /api/infinity/projects/:id/automations/:automationId — get automation details */
router.get("/projects/:id/automations/:automationId", async (req, res) => {
  const projectId = cleanText(req.params.id, 80);
  const automationId = cleanText(req.params.automationId, 80);
  try {
    const project = await resolveProject(projectId);
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    const [automation] = await db
      .select()
      .from(projectAutomations)
      .where(and(eq(projectAutomations.projectId, projectId), eq(projectAutomations.id, automationId)))
      .limit(1);

    if (!automation) {
      res.status(404).json({ error: "Automation not found" });
      return;
    }

    res.json({
      id: automation.id,
      name: automation.name,
      description: automation.description,
      trigger: automation.trigger,
      action: automation.action,
      enabled: automation.enabled,
      lastRunAt: automation.lastRunAt?.toISOString() ?? null,
      nextRunAt: automation.nextRunAt?.toISOString() ?? null,
      runCount: automation.runCount,
      lastStatus: automation.lastStatus,
      lastError: automation.lastError,
      lastResult: automation.lastResult,
      createdAt: automation.createdAt.toISOString(),
      updatedAt: automation.updatedAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get project automation");
    res.status(500).json({ error: "Failed to get automation" });
  }
});

/** PATCH /api/infinity/projects/:id/automations/:automationId — update automation */
router.patch("/projects/:id/automations/:automationId", async (req, res) => {
  const projectId = cleanText(req.params.id, 80);
  const automationId = cleanText(req.params.automationId, 80);
  const { name, description, trigger, action, enabled } = req.body as {
    name?: string;
    description?: string;
    trigger?: { type: TriggerType; expression?: string; path?: string };
    action?: { type: ActionType; [key: string]: unknown };
    enabled?: boolean;
  };

  try {
    const project = await resolveProject(projectId);
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    const [automation] = await db
      .select()
      .from(projectAutomations)
      .where(and(eq(projectAutomations.projectId, projectId), eq(projectAutomations.id, automationId)))
      .limit(1);

    if (!automation) {
      res.status(404).json({ error: "Automation not found" });
      return;
    }

    // Validate trigger if provided
    if (trigger) {
      if (!VALID_TRIGGER_TYPES.includes(trigger.type)) {
        res.status(400).json({ error: `Invalid trigger type` });
        return;
      }
      if (trigger.type === "cron" && !trigger.expression) {
        res.status(400).json({ error: "cron trigger requires expression" });
        return;
      }
      if (trigger.type === "webhook" && !trigger.path) {
        res.status(400).json({ error: "webhook trigger requires path" });
        return;
      }
    }

    // Validate action if provided
    if (action && !VALID_ACTION_TYPES.includes(action.type)) {
      res.status(400).json({ error: `Invalid action type` });
      return;
    }

    // Compute nextRunAt for cron
    let nextRunAt = automation.nextRunAt;
    if (trigger?.type === "cron" && trigger.expression) {
      nextRunAt = getNextCronRun(trigger.expression);
    }

    const [updated] = await db
      .update(projectAutomations)
      .set({
        name: name?.trim().slice(0, 200) ?? automation.name,
        description: description?.slice(0, 2000) ?? automation.description,
        trigger: trigger ?? automation.trigger,
        action: action ?? automation.action,
        enabled: enabled ?? automation.enabled,
        nextRunAt,
        updatedAt: new Date(),
      })
      .where(eq(projectAutomations.id, automationId))
      .returning();

    res.json({
      id: updated.id,
      name: updated.name,
      description: updated.description,
      trigger: updated.trigger,
      action: updated.action,
      enabled: updated.enabled,
      lastRunAt: updated.lastRunAt?.toISOString() ?? null,
      nextRunAt: updated.nextRunAt?.toISOString() ?? null,
      runCount: updated.runCount,
      lastStatus: updated.lastStatus,
      lastError: updated.lastError,
      lastResult: updated.lastResult,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to update project automation");
    res.status(500).json({ error: "Failed to update automation" });
  }
});

/** DELETE /api/infinity/projects/:id/automations/:automationId — delete automation */
router.delete("/projects/:id/automations/:automationId", async (req, res) => {
  const projectId = cleanText(req.params.id, 80);
  const automationId = cleanText(req.params.automationId, 80);
  try {
    const project = await resolveProject(projectId);
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    const [automation] = await db
      .select()
      .from(projectAutomations)
      .where(and(eq(projectAutomations.projectId, projectId), eq(projectAutomations.id, automationId)))
      .limit(1);

    if (!automation) {
      res.status(404).json({ error: "Automation not found" });
      return;
    }

    await db.delete(projectAutomations).where(eq(projectAutomations.id, automationId));

    await logActivity(projectId, "automation_updated", `Deleted automation "${automation.name}"`);

    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete project automation");
    res.status(500).json({ error: "Failed to delete automation" });
  }
});

/** POST /api/infinity/projects/:id/automations/:automationId/run — manually trigger automation */
router.post("/projects/:id/automations/:automationId/run", async (req, res) => {
  const projectId = cleanText(req.params.id, 80);
  const automationId = cleanText(req.params.automationId, 80);
  try {
    const project = await resolveProject(projectId);
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    const [automation] = await db
      .select()
      .from(projectAutomations)
      .where(and(eq(projectAutomations.projectId, projectId), eq(projectAutomations.id, automationId)))
      .limit(1);

    if (!automation) {
      res.status(404).json({ error: "Automation not found" });
      return;
    }

    if (!automation.enabled) {
      res.status(400).json({ error: "Automation is disabled" });
      return;
    }

    // Create run record
    const runId = randomUUID();
    await db.insert(projectAutomationRuns).values({
      id: runId,
      projectId,
      automationId,
      triggeredBy: "manual",
      status: "running",
      startedAt: new Date(),
      logs: [`[${new Date().toISOString()}] Automation started manually`],
    });

    // Update automation last run
    await db
      .update(projectAutomations)
      .set({
        lastRunAt: new Date(),
        lastStatus: "running",
        lastError: null,
        runCount: sql`${projectAutomations.runCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(projectAutomations.id, automationId));

    // Execute the action (async, don't await)
    const actionConfig = (automation.action ?? { type: "send_notification" }) as {
      type: ActionType;
      [key: string]: unknown;
    };
    executeAutomationAction(projectId, automationId, runId, actionConfig, "manual")
      .then((result) => {
        // Update run and automation on completion
        updateRunAndAutomation(projectId, automationId, runId, "success", result);
      })
      .catch((err) => {
        updateRunAndAutomation(projectId, automationId, runId, "failed", null, String(err));
      });

    await logActivity(projectId, "automation_run", `Manually ran automation "${automation.name}"`);

    res.json({ runId, status: "started", message: "Automation started" });
  } catch (err) {
    req.log.error({ err }, "Failed to run project automation");
    res.status(500).json({ error: "Failed to run automation" });
  }
});

/** GET /api/infinity/projects/:id/automations/:automationId/runs — list run history */
router.get("/projects/:id/automations/:automationId/runs", async (req, res) => {
  const projectId = cleanText(req.params.id, 80);
  const automationId = cleanText(req.params.automationId, 80);
  const limit = Math.min(parseInt(String(req.query.limit ?? "20"), 10), 100);
  try {
    const project = await resolveProject(projectId);
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    const rows = await db
      .select()
      .from(projectAutomationRuns)
      .where(and(eq(projectAutomationRuns.projectId, projectId), eq(projectAutomationRuns.automationId, automationId)))
      .orderBy(desc(projectAutomationRuns.startedAt))
      .limit(limit);

    res.json({
      runs: rows.map((r) => ({
        id: r.id,
        automationId: r.automationId,
        triggeredBy: r.triggeredBy,
        status: r.status,
        startedAt: r.startedAt.toISOString(),
        completedAt: r.completedAt?.toISOString() ?? null,
        error: r.error,
        result: r.result,
        logs: r.logs,
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to list automation runs");
    res.status(500).json({ error: "Failed to list runs" });
  }
});

// ── Internal: Execute automation action ─────────────────────────────

async function executeAutomationAction(
  projectId: string,
  automationId: string,
  runId: string,
  action: { type: ActionType; [key: string]: unknown },
  triggeredBy: "cron" | "webhook" | "manual" | "test",
): Promise<Record<string, unknown>> {
  const addLog = async (message: string) => {
    // We can't easily append to JSONB array in a simple way, so we'll use raw SQL
    // For now, just log to console - full logging would need a more sophisticated approach
    console.log(`[automation:${runId}] ${message}`);
  };

  await addLog(`Executing action: ${action.type}`);

  switch (action.type) {
    case "run_agent": {
      // TODO: Trigger build agent with prompt
      const prompt = (action.prompt as string) ?? "Run project agent";
      await addLog(`Would run agent with prompt: ${prompt}`);
      return { action: "run_agent", prompt, status: "simulated" };
    }

    case "send_notification": {
      // TODO: Send push notification
      const title = (action.title as string) ?? "Automation";
      const body = (action.body as string) ?? "Automation completed";
      await addLog(`Would send notification: ${title} - ${body}`);
      return { action: "send_notification", title, body, status: "simulated" };
    }

    case "sync_connector": {
      const provider = (action.provider as string) ?? "all";
      await addLog(`Would sync connector: ${provider}`);
      // TODO: Actually trigger connector sync
      return { action: "sync_connector", provider, status: "simulated" };
    }

    case "generate_faq": {
      await addLog("Would generate FAQ");
      // TODO: Call FAQ generation
      return { action: "generate_faq", status: "simulated" };
    }

    case "scan_conflicts": {
      await addLog("Would scan conflicts");
      // TODO: Call conflict detection
      return { action: "scan_conflicts", status: "simulated" };
    }

    case "cleanup_project": {
      await addLog("Would run project cleanup");
      // TODO: Call project cleanup
      return { action: "cleanup_project", status: "simulated" };
    }

    default:
      throw new Error(`Unknown action type: ${(action as { type: string }).type}`);
  }
}

async function updateRunAndAutomation(
  projectId: string,
  automationId: string,
  runId: string,
  status: "success" | "failed",
  result: Record<string, unknown> | null,
  error?: string,
) {
  await db
    .update(projectAutomationRuns)
    .set({
      status,
      completedAt: new Date(),
      error: error ?? null,
      result,
    })
    .where(eq(projectAutomationRuns.id, runId));

  await db
    .update(projectAutomations)
    .set({
      lastStatus: status,
      lastError: error ?? null,
      lastResult: result,
      lastRunAt: new Date(),
      // Update nextRunAt for cron
      ...(status === "success" ? {} : {}),
      updatedAt: new Date(),
    })
    .where(eq(projectAutomations.id, automationId));

  // If it was a cron job, compute next run
  const [automation] = await db
    .select()
    .from(projectAutomations)
    .where(eq(projectAutomations.id, automationId))
    .limit(1);

  if (automation && automation.trigger && (automation.trigger as { type: string }).type === "cron") {
    const nextRunAt = getNextCronRun((automation.trigger as { expression: string }).expression);
    if (nextRunAt) {
      await db
        .update(projectAutomations)
        .set({ nextRunAt, updatedAt: new Date() })
        .where(eq(projectAutomations.id, automationId));
    }
  }
}

export default router;