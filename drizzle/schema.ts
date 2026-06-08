import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Conversations table
export const conversations = mysqlTable('conversations', {
  id: int('id').autoincrement().primaryKey(),
  userId: int('user_id').notNull().references(() => users.id),
  title: varchar('title', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;

// Messages table
export const messages = mysqlTable('messages', {
  id: int('id').autoincrement().primaryKey(),
  conversationId: int('conversation_id').notNull().references(() => conversations.id),
  role: varchar('role', { length: 20 }).notNull(), // 'user' | 'assistant'
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

// Skills table
export const skills = mysqlTable('skills', {
  id: int('id').autoincrement().primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  description: text('description'),
  systemPrompt: text('system_prompt'),
  enabled: int('enabled').default(1).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type Skill = typeof skills.$inferSelect;
export type InsertSkill = typeof skills.$inferInsert;

// User Skills junction table
export const userSkills = mysqlTable('user_skills', {
  id: int('id').autoincrement().primaryKey(),
  userId: int('user_id').notNull().references(() => users.id),
  skillId: int('skill_id').notNull().references(() => skills.id),
  enabled: int('enabled').default(1).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type UserSkill = typeof userSkills.$inferSelect;
export type InsertUserSkill = typeof userSkills.$inferInsert;

// Connectors table
export const connectors = mysqlTable('connectors', {
  id: int('id').autoincrement().primaryKey(),
  userId: int('user_id').notNull().references(() => users.id),
  type: varchar('type', { length: 50 }).notNull(), // 'gmail', 'google_calendar', 'notion', 'slack'
  status: varchar('status', { length: 20 }).default('disconnected').notNull(), // 'connected' | 'disconnected'
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  expiresAt: timestamp('expires_at'),
  metadata: text('metadata'), // JSON string for additional data
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

export type Connector = typeof connectors.$inferSelect;
export type InsertConnector = typeof connectors.$inferInsert;

// Scheduled Tasks table
export const scheduledTasks = mysqlTable('scheduled_tasks', {
  id: int('id').autoincrement().primaryKey(),
  userId: int('user_id').notNull().references(() => users.id),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  cronExpression: varchar('cron_expression', { length: 100 }).notNull(),
  taskData: text('task_data'), // JSON string
  enabled: int('enabled').default(1).notNull(),
  lastRun: timestamp('last_run'),
  nextRun: timestamp('next_run'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

export type ScheduledTask = typeof scheduledTasks.$inferSelect;
export type InsertScheduledTask = typeof scheduledTasks.$inferInsert;

// Projects table
export const projects = mysqlTable('projects', {
  id: int('id').autoincrement().primaryKey(),
  userId: int('user_id').notNull().references(() => users.id),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

// Project Conversations junction table
export const projectConversations = mysqlTable('project_conversations', {
  id: int('id').autoincrement().primaryKey(),
  projectId: int('project_id').notNull().references(() => projects.id),
  conversationId: int('conversation_id').notNull().references(() => conversations.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type ProjectConversation = typeof projectConversations.$inferSelect;
export type InsertProjectConversation = typeof projectConversations.$inferInsert;