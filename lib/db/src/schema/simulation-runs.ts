import { pgTable, text, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

// Structured scientific data, not file blobs. Reports are rendered on demand.
export const simulationRunsTable = pgTable("simulation_runs", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  fingerprint: text("fingerprint").notNull(),
  config: jsonb("config").notNull(),
  result: jsonb("result").notNull(),
});
export const insertSimulationRunSchema = createInsertSchema(simulationRunsTable);
export type SimulationRunRow = typeof simulationRunsTable.$inferSelect;
