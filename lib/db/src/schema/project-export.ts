import { pgTable, text, timestamp, uuid, index } from "drizzle-orm/pg-core";
import { projects } from "./projects";

/**
 * Project export jobs.
 * An export bundles the entire project (all scoped tables + files + conversations)
 * into a downloadable .zip. The file is written to local storage and served via the
 * file URL; it auto-expires so we don't accumulate blobs forever.
 */
export const projectExports = pgTable(
  "project_exports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    // pending → ready → failed
    status: text("status", { enum: ["pending", "ready", "failed"] })
      .notNull()
      .default("pending"),
    // Path/URL to the generated .zip (local storage key or signed URL)
    fileUrl: text("file_url"),
    // Human-readable error, set when status = failed
    error: text("error"),
    // Link auto-expires after this time (default 24h). Null = keep forever.
    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("project_exports_project_idx").on(table.projectId),
    index("project_exports_project_created_idx").on(table.projectId, table.createdAt),
  ],
);

export type ProjectExport = typeof projectExports.$inferSelect;
export type NewProjectExport = typeof projectExports.$inferInsert;
