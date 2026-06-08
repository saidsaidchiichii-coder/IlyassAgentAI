import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  createConversation,
  getConversations,
  getConversationById,
  addMessage,
  getMessages,
  getSkillByName,
} from "../db";
import { invokeLLM } from "../_core/llm";

export const chatRouter = router({
  // Create a new conversation
  createConversation: protectedProcedure
    .input(z.object({ title: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      try {
        await createConversation(ctx.user.id, input.title);
        return { success: true };
      } catch (error) {
        console.error("Failed to create conversation:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create conversation",
        });
      }
    }),

  // Get all conversations for the user
  getConversations: protectedProcedure.query(async ({ ctx }) => {
    try {
      const convos = await getConversations(ctx.user.id);
      return convos;
    } catch (error) {
      console.error("Failed to get conversations:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to get conversations",
      });
    }
  }),

  // Get a specific conversation with its messages
  getConversation: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      try {
        const convo = await getConversationById(input.id);
        if (!convo || convo.userId !== ctx.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Access denied",
          });
        }

        const msgs = await getMessages(input.id);
        return { conversation: convo, messages: msgs };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Failed to get conversation:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get conversation",
        });
      }
    }),

  // Send a message and get LLM response
  sendMessage: protectedProcedure
    .input(
      z.object({
        conversationId: z.number(),
        message: z.string().min(1),
        skillName: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Verify conversation ownership
        const convo = await getConversationById(input.conversationId);
        if (!convo || convo.userId !== ctx.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Access denied",
          });
        }

        // Save user message
        await addMessage(input.conversationId, "user", input.message);

        // Get skill system prompt if specified
        let systemPrompt = "You are a helpful AI assistant.";
        if (input.skillName) {
          const skill = await getSkillByName(input.skillName);
          if (skill && skill.systemPrompt) {
            systemPrompt = skill.systemPrompt;
          }
        }

        // Get conversation history
        const messages = await getMessages(input.conversationId);

        // Prepare messages for LLM
        const llmMessages = [
          { role: "system", content: systemPrompt },
          ...messages.map((m) => ({
            role: m.role === "user" ? "user" : "assistant",
            content: m.content,
          })),
        ] as Array<{ role: string; content: string }>;

        // Call LLM
        const response = await invokeLLM({
          messages: llmMessages as any,
        });

        const assistantMessage =
          typeof response.choices[0]?.message?.content === "string"
            ? response.choices[0].message.content
            : "I could not generate a response.";

        // Save assistant message
        await addMessage(input.conversationId, "assistant", assistantMessage);

        return { message: assistantMessage };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Failed to send message:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to send message",
        });
      }
    }),
});
