import { pgTable, text, integer, date, timestamp, boolean, uuid, jsonb } from "drizzle-orm/pg-core";

export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  color: text("color").notNull(),
  archived: boolean("archived").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  trelloCardId: text("trello_card_id"),
  nameOverridden: boolean("name_overridden").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const dailyReports = pgTable("daily_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  date: date("date").notNull().unique(),
  overview: text("overview").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const timeEntries = pgTable("time_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  reportId: uuid("report_id")
    .notNull()
    .references(() => dailyReports.id, { onDelete: "cascade" }),
  taskId: uuid("task_id")
    .notNull()
    .references(() => tasks.id, { onDelete: "restrict" }),
  hours: integer("hours").notNull(),
  memo: text("memo"),
});
