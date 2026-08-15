import { pgTable, text, timestamp, uuid, index, bigint, integer, jsonb } from "drizzle-orm/pg-core";
import { projects } from "./projects";

/**
 * Project Connectors — external service connections scoped to a project.
 * Each project can have at most one connection per provider (enforced by unique index on projectId+provider).
 * Tokens are encrypted at rest (handled by app layer).
 */
export const projectConnectors = pgTable(
  "project_connectors",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    // Provider identifier: github | google_drive | figma | canva | google_calendar
    provider: text("provider", { enum: ["github", "google_drive", "figma", "canva", "google_calendar"] })
      .notNull(),
    // Human-readable display name (e.g., "my-github", "work-drive")
    displayName: text("display_name"),
    // OAuth access token (encrypted via app-layer helper)
    accessToken: text("access_token"),
    // OAuth refresh token (encrypted via app-layer helper)
    refreshToken: text("refresh_token"),
    // Token expiry (unix ms)
    expiresAt: bigint("expires_at", { mode: "number" }),
    // Provider-specific config (scope, repo name, etc.) stored as JSON
    config: jsonb("config").default({}).notNull(),
    // Connection status
    status: text("status", { enum: ["connected", "disconnected", "error", "expired"] })
      .notNull()
      .default("disconnected"),
    // Last error message (if status = error)
    error: text("error"),
    // Last successful sync timestamp
    lastSyncAt: timestamp("last_sync_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("project_connectors_project_idx").on(table.projectId),
    // One connection per provider per project
    index("project_connectors_project_provider_idx").on(table.projectId, table.provider),
  ],
);

export type ProjectConnector = typeof projectConnectors.$inferSelect;
export type NewProjectConnector = typeof projectConnectors.$inferInsert;