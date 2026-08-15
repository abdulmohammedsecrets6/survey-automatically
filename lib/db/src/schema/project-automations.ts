import { pgTable, text, timestamp, uuid, index, integer, jsonb, boolean } from "drizzle-orm/pg-core";
import { projects } from "./projects";

/**
 * Project Automations — scheduled triggers that run within a project context.
 * Supports cron expressions, webhook endpoints, and manual triggers.
 * Actions: run_agent, send_notification, sync_connector, generate_faq, scan_conflicts, cleanup_project
 */
export const projectAutomations = pgTable(
  "project_automations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    // Human-readable name
    name: text("name").notNull(),
    // Description of what this automation does
    description: text("description"),
    // Trigger configuration (JSON)
    // Types: cron | webhook | manual
    // cron: { type: "cron", expression: "0 9 * * 1" }
    // webhook: { type: "webhook", path: "/automation/abc123" }
    // manual: { type: "manual" }
    trigger: jsonb("trigger").notNull(),
    // Action configuration (JSON)
    // Types: run_agent | send_notification | sync_connector | generate_faq | scan_conflicts | cleanup_project
    action: jsonb("action").notNull(),
    // Whether the automation is enabled
    enabled: boolean("enabled").notNull().default(true),
    // Last run timestamp
    lastRunAt: timestamp("last_run_at"),
    // Next scheduled run (for cron)
    nextRunAt: timestamp("next_run_at"),
    // Run count
    runCount: integer("run_count").notNull().default(0),
    // Last run status
    lastStatus: text("last_status", { enum: ["success", "failed", "running"] }),
    // Last run error
    lastError: text("last_error"),
    // Last run result summary (JSON)
    lastResult: jsonb("last_result"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("project_automations_project_idx").on(table.projectId),
    index("project_automations_project_enabled_idx").on(table.projectId, table.enabled),
    index("project_automations_next_run_idx").on(table.nextRunAt),
  ],
);

/**
 * Automation run history — append-only log of each automation execution.
 */
export const projectAutomationRuns = pgTable(
  "project_automation_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    automationId: uuid("automation_id")
      .notNull()
      .references(() => projectAutomations.id, { onDelete: "cascade" }),
    // Triggered by: cron | webhook | manual | test
    triggeredBy: text("triggered_by", { enum: ["cron", "webhook", "manual", "test"] })
      .notNull()
      .default("manual"),
    // Run status
    status: text("status", { enum: ["running", "success", "failed", "cancelled"] })
      .notNull()
      .default("running"),
    // Started at
    startedAt: timestamp("started_at").notNull().defaultNow(),
    // Completed at
    completedAt: timestamp("completed_at"),
    // Error message (if failed)
    error: text("error"),
    // Result summary (JSON)
    result: jsonb("result"),
    // Log output (for debugging)
    logs: jsonb("logs").default([]).notNull(),
  },
  (table) => [
    index("project_automation_runs_project_idx").on(table.projectId),
    index("project_automation_runs_automation_idx").on(table.automationId),
    index("project_automation_runs_started_idx").on(table.startedAt),
  ],
);

export type ProjectAutomation = typeof projectAutomations.$inferSelect;
export type NewProjectAutomation = typeof projectAutomations.$inferInsert;
export type ProjectAutomationRun = typeof projectAutomationRuns.$inferSelect;
export type NewProjectAutomationRun = typeof projectAutomationRuns.$inferInsert;