import { describe, it, expect, vi, beforeEach } from "vitest";
import { chatRouter } from "./chat";
import { TRPCError } from "@trpc/server";

// Mock database functions
vi.mock("../db", () => ({
  createConversation: vi.fn(),
  getConversations: vi.fn(),
  getConversationById: vi.fn(),
  addMessage: vi.fn(),
  getMessages: vi.fn(),
  getSkillByName: vi.fn(),
}));

// Mock LLM
vi.mock("../_core/llm", () => ({
  invokeLLM: vi.fn(),
}));

import * as db from "../db";
import * as llm from "../_core/llm";

const mockUser = {
  id: 1,
  openId: "test-user",
  email: "test@example.com",
  name: "Test User",
  loginMethod: "manus",
  role: "user" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

describe("Chat Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createConversation", () => {
    it("should create a new conversation", async () => {
      const caller = chatRouter.createCaller({ user: mockUser, req: {}, res: {} });

      vi.mocked(db.createConversation).mockResolvedValue({} as any);

      const result = await caller.createConversation({ title: "Test Conversation" });

      expect(result).toEqual({ success: true });
      expect(db.createConversation).toHaveBeenCalledWith(1, "Test Conversation");
    });

    it("should throw error if title is empty", async () => {
      const caller = chatRouter.createCaller({ user: mockUser, req: {}, res: {} });

      await expect(caller.createConversation({ title: "" })).rejects.toThrow();
    });
  });

  describe("getConversations", () => {
    it("should return conversations for the user", async () => {
      const caller = chatRouter.createCaller({ user: mockUser, req: {}, res: {} });

      const mockConversations = [
        { id: 1, userId: 1, title: "Convo 1", createdAt: new Date(), updatedAt: new Date() },
        { id: 2, userId: 1, title: "Convo 2", createdAt: new Date(), updatedAt: new Date() },
      ];

      vi.mocked(db.getConversations).mockResolvedValue(mockConversations as any);

      const result = await caller.getConversations();

      expect(result).toEqual(mockConversations);
      expect(db.getConversations).toHaveBeenCalledWith(1);
    });
  });

  describe("sendMessage", () => {
    it("should send a message and return LLM response", async () => {
      const caller = chatRouter.createCaller({ user: mockUser, req: {}, res: {} });

      vi.mocked(db.getConversationById).mockResolvedValue({
        id: 1,
        userId: 1,
        title: "Test",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      vi.mocked(db.addMessage).mockResolvedValue({} as any);
      vi.mocked(db.getMessages).mockResolvedValue([
        { id: 1, conversationId: 1, role: "user", content: "Hello", createdAt: new Date() },
      ] as any);

      vi.mocked(db.getSkillByName).mockResolvedValue(null);
      vi.mocked(llm.invokeLLM).mockResolvedValue({
        choices: [
          {
            message: {
              content: "Hi there!",
            },
          },
        ],
      } as any);

      const result = await caller.sendMessage({
        conversationId: 1,
        message: "Hello",
      });

      expect(result.message).toBe("Hi there!");
      expect(db.addMessage).toHaveBeenCalledTimes(2); // User message + assistant message
    });

    it("should throw error if conversation does not belong to user", async () => {
      const caller = chatRouter.createCaller({ user: mockUser, req: {}, res: {} });

      vi.mocked(db.getConversationById).mockResolvedValue({
        id: 1,
        userId: 999, // Different user
        title: "Test",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      await expect(
        caller.sendMessage({
          conversationId: 1,
          message: "Hello",
        })
      ).rejects.toThrow("Access denied");
    });

    it("should inject skill system prompt if provided", async () => {
      const caller = chatRouter.createCaller({ user: mockUser, req: {}, res: {} });

      vi.mocked(db.getConversationById).mockResolvedValue({
        id: 1,
        userId: 1,
        title: "Test",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      vi.mocked(db.addMessage).mockResolvedValue({} as any);
      vi.mocked(db.getMessages).mockResolvedValue([]);
      vi.mocked(db.getSkillByName).mockResolvedValue({
        id: 1,
        name: "test-skill",
        description: "Test skill",
        systemPrompt: "You are a test assistant.",
        enabled: 1,
        createdAt: new Date(),
      } as any);

      vi.mocked(llm.invokeLLM).mockResolvedValue({
        choices: [
          {
            message: {
              content: "Test response",
            },
          },
        ],
      } as any);

      await caller.sendMessage({
        conversationId: 1,
        message: "Hello",
        skillName: "test-skill",
      });

      // Verify that invokeLLM was called with the skill system prompt
      const callArgs = vi.mocked(llm.invokeLLM).mock.calls[0][0];
      expect(callArgs.messages[0].content).toBe("You are a test assistant.");
    });
  });
});
