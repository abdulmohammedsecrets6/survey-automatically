import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Persistent cross-chat memory.
 * Each row represents one fact Infinity AI has learned about the user.
 * The `topic` column is used as an upsert key — if the same topic
 * is learned again, the value is updated rather than duplicated.
 * `sourceType` and `sourceRef` provide provenance for every fact.
 */
export const userMemories = pgTable("user_memories", {
  topic: text("topic").primaryKey(),       // e.g. "pet preference", "name", "location"
  value: text("value").notNull(),           // e.g. "The user likes frogs"
  sourceType: text("source_type"),          // 'conversation' | 'file' | 'research' | 'manual' | 'project_memory'
  sourceRef: text("source_ref"),            // conversationId, fileId, researchJobId, projectId:memoryKey, etc.
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type UserMemory = typeof userMemories.$inferSelect;
