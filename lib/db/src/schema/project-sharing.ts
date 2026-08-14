import { pgTable, text, timestamp, uuid, index } from "drizzle-orm/pg-core";
import { projects } from "./projects";

/**
 * Project sharing invitations.
 * Each row grants a person access to a project via a magic link (accessToken).
 * `permission` controls what they can do: read-only or collaborator (read+write).
 */
export const projectShares = pgTable(
  "project_shares",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    // Public magic-link token embedded in /p/:token URLs. Single-use lookup key.
    accessToken: uuid("access_token").notNull().unique().defaultRandom(),
    // read = view only; collaborator = read + edit project-scoped data
    permission: text("permission", { enum: ["read", "collaborator"] })
      .notNull()
      .default("read"),
    // Optional email of the invitee (for display + de-dup). Not required for link sharing.
    email: text("email"),
    // Nullable expiry. Null means the link never expires.
    expiresAt: timestamp("expires_at"),
    // Who created the share (used for audit + to prevent owners removing themselves).
    createdBy: text("created_by"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("project_shares_project_idx").on(table.projectId),
    index("project_shares_token_idx").on(table.accessToken),
  ],
);

export type ProjectShare = typeof projectShares.$inferSelect;
export type NewProjectShare = typeof projectShares.$inferInsert;
