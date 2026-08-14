import { pgTable, uuid, text, jsonb, timestamp, index, integer } from "drizzle-orm/pg-core";
import { projects } from "./projects";

export const projectConflicts = pgTable(
  "project_conflicts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    claimA: text("claim_a").notNull(),
    sourceA: text("source_a").notNull(),
    claimB: text("claim_b").notNull(),
    sourceB: text("source_b").notNull(),
    severity: text("severity", { enum: ["high", "medium", "low"] }).notNull(),
    resolved: jsonb("resolved").default([]).notNull(), // array of resolution actions
    detectedAt: timestamp("detected_at", { withTimezone: true }).defaultNow().notNull(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (table) => [
    index("project_conflicts_project_id_idx").on(table.projectId),
    index("project_conflicts_detected_at_idx").on(table.detectedAt),
  ],
);

export type ProjectConflict = typeof projectConflicts.$inferSelect;
export type NewProjectConflict = typeof projectConflicts.$inferInsert;