import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getSkills, getSkillByName } from "../db";

export const skillsRouter = router({
  // Get all available skills
  getSkills: protectedProcedure.query(async () => {
    try {
      const allSkills = await getSkills();
      return allSkills;
    } catch (error) {
      console.error("Failed to get skills:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to get skills",
      });
    }
  }),

  // Get a specific skill
  getSkill: protectedProcedure
    .input(z.object({ name: z.string() }))
    .query(async ({ input }) => {
      try {
        const skill = await getSkillByName(input.name);
        if (!skill) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Skill not found",
          });
        }
        return skill;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Failed to get skill:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get skill",
        });
      }
    }),
});
