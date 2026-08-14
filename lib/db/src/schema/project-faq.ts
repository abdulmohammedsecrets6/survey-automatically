import { pgTable, text, timestamp, uuid, index, jsonb } from "drizzle-orm/pg-core";
import { projects } from "./projects";

/**
 * Project FAQ cache.
 * Stores AI-generated FAQ entries with Q&A pairs and source citations.
 * Each project keeps the latest FAQ; older ones are retained for history.
 */
export const projectFaqs = pgTable(
  "project_faqs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    // JSON array of { q: string, a: string, sources: string[] }
    faq: jsonb("faq").notNull().default([]),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("project_faqs_project_idx").on(table.projectId),
    index("project_faqs_project_created_idx").on(table.projectId, table.createdAt),
  ],
);

export type ProjectFaq = typeof projectFaqs.$inferSelect;
export type NewProjectFaq = typeof projectFaqs.$inferInsert;