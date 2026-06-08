import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  conversations,
  messages,
  skills,
  connectors,
  projects,
  scheduledTasks,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Conversation queries
export async function createConversation(userId: number, title: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(conversations).values({ userId, title });
  return result;
}

export async function getConversations(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(conversations).where(eq(conversations.userId, userId));
}

export async function getConversationById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(conversations).where(eq(conversations.id, id)).limit(1);
  return result[0];
}

// Message queries
export async function addMessage(conversationId: number, role: string, content: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(messages).values({ conversationId, role, content });
}

export async function getMessages(conversationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(messages).where(eq(messages.conversationId, conversationId));
}

// Skills queries
export async function getSkills() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(skills).where(eq(skills.enabled, 1));
}

export async function getSkillByName(name: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(skills).where(eq(skills.name, name)).limit(1);
  return result[0];
}

// Connector queries
export async function getConnectors(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(connectors).where(eq(connectors.userId, userId));
}

export async function createConnector(userId: number, type: string, status: string = "disconnected") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(connectors).values({ userId, type, status });
}

// Project queries
export async function getProjects(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(projects).where(eq(projects.userId, userId));
}

export async function createProject(userId: number, name: string, description?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(projects).values({ userId, name, description });
}

// Scheduled Tasks queries
export async function getScheduledTasks(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(scheduledTasks).where(eq(scheduledTasks.userId, userId));
}

export async function createScheduledTask(
  userId: number,
  name: string,
  cronExpression: string,
  taskData?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(scheduledTasks).values({ userId, name, cronExpression, taskData });
}
