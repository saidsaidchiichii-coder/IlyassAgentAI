import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  getProjects,
  createProject,
  getScheduledTasks,
  createScheduledTask,
} from "../db";

export const projectsRouter = router({
  // Get all projects for the user
  getProjects: protectedProcedure.query(async ({ ctx }) => {
    try {
      const projects = await getProjects(ctx.user.id);
      return projects;
    } catch (error) {
      console.error("Failed to get projects:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to get projects",
      });
    }
  }),

  // Create a new project
  createProject: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        await createProject(ctx.user.id, input.name, input.description);
        return { success: true };
      } catch (error) {
        console.error("Failed to create project:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create project",
        });
      }
    }),

  // Get all scheduled tasks for the user
  getScheduledTasks: protectedProcedure.query(async ({ ctx }) => {
    try {
      const tasks = await getScheduledTasks(ctx.user.id);
      return tasks;
    } catch (error) {
      console.error("Failed to get scheduled tasks:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to get scheduled tasks",
      });
    }
  }),

  // Create a new scheduled task
  createScheduledTask: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        cronExpression: z.string().min(1),
        description: z.string().optional(),
        taskData: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        await createScheduledTask(
          ctx.user.id,
          input.name,
          input.cronExpression,
          input.taskData
        );
        return { success: true };
      } catch (error) {
        console.error("Failed to create scheduled task:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create scheduled task",
        });
      }
    }),
});
