import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getConnectors, createConnector } from "../db";

export const connectorsRouter = router({
  // Get all connectors for the user
  getConnectors: protectedProcedure.query(async ({ ctx }) => {
    try {
      const connectors = await getConnectors(ctx.user.id);
      return connectors;
    } catch (error) {
      console.error("Failed to get connectors:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to get connectors",
      });
    }
  }),

  // Create a new connector (placeholder for OAuth flow)
  createConnector: protectedProcedure
    .input(
      z.object({
        type: z.enum(["gmail", "google_calendar", "notion", "slack"]),
        status: z.enum(["connected", "disconnected"]).default("disconnected"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // In a real implementation, this would initiate OAuth flow
        // For now, we just create a placeholder connector
        await createConnector(ctx.user.id, input.type, input.status);
        return { success: true };
      } catch (error) {
        console.error("Failed to create connector:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create connector",
        });
      }
    }),

  // Get OAuth URL for a connector type
  getOAuthUrl: protectedProcedure
    .input(z.object({ type: z.string() }))
    .query(async ({ input, ctx }) => {
      // Placeholder implementation
      // In production, generate proper OAuth URLs based on connector type
      const baseUrls: Record<string, string> = {
        gmail: "https://accounts.google.com/o/oauth2/v2/auth?client_id=YOUR_CLIENT_ID&scope=https://www.googleapis.com/auth/gmail.readonly",
        google_calendar:
          "https://accounts.google.com/o/oauth2/v2/auth?client_id=YOUR_CLIENT_ID&scope=https://www.googleapis.com/auth/calendar",
        notion: "https://api.notion.com/v1/oauth/authorize?client_id=YOUR_CLIENT_ID&response_type=code&owner=user",
        slack: "https://slack.com/oauth_authorize?client_id=YOUR_CLIENT_ID&scope=chat:write,users:read",
      };

      return { url: baseUrls[input.type] || "" };
    }),
});
