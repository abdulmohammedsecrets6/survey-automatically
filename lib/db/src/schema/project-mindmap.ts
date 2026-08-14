import {
  index,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { projects } from "./projects";

/**
 * Inferred relationships between project entities (files, memories, instructions, tasks, research).
 * Populated by LLM-based inference from project context.
 */
export const projectConnections = pgTable(
  "project_connections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    nodeAType: text("node_a_type", {
      enum: ["file", "memory", "instruction", "task", "research"],
    }).notNull(),
    nodeAId: text("node_a_id").notNull(),
    nodeBType: text("node_b_type", {
      enum: ["file", "memory", "instruction", "task", "research"],
    }).notNull(),
    nodeBId: text("node_b_id").notNull(),
    /** Relationship type between the two nodes */
    relationship: text("relationship", {
      enum: ["references", "supports", "contradicts", "depends_on"],
    }).notNull(),
    /** LLM confidence score 0–1 */
    confidence: real("confidence").notNull().default(0.5),
    /** Optional LLM-generated explanation for the connection */
    explanation: text("explanation"),
    /** When this connection was inferred */
    inferredAt: timestamp("inferred_at").notNull().defaultNow(),
  },
  (table) => [
    index("project_connections_project_idx").on(table.projectId),
    index("project_connections_node_a_idx").on(table.nodeAType, table.nodeAId),
    index("project_connections_node_b_idx").on(table.nodeBType, table.nodeBId),
    // Prevent duplicate connections between same nodes with same relationship
    index("project_connections_dedup_idx").on(
      table.projectId,
      table.nodeAType,
      table.nodeAId,
      table.nodeBType,
      table.nodeBId,
      table.relationship,
    ),
  ],
);

export type ProjectConnection = typeof projectConnections.$inferSelect;
export type NewProjectConnection = typeof projectConnections.$inferInsert;

/** Node types for the mindmap graph */
export type MindmapNodeType = "file" | "memory" | "instruction" | "task" | "research";

/** Mindmap node structure for the frontend */
export interface MindmapNode {
  id: string; // composite: `${type}:${id}`
  type: MindmapNodeType;
  label: string;
  data?: Record<string, unknown>;
}

/** Mindmap edge structure for the frontend */
export interface MindmapEdge {
  id: string; // composite: `${sourceId}-${targetId}-${relationship}`
  source: string; // node id
  target: string; // node id
  relationship: "references" | "supports" | "contradicts" | "depends_on";
  confidence: number;
  explanation?: string;
}

/** Full mindmap payload for the frontend */
export interface MindmapData {
  nodes: MindmapNode[];
  edges: MindmapEdge[];
}