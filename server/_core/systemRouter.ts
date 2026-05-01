import { z } from "zod";
import { notifyOwner } from "./notification";
import { adminProcedure, publicProcedure, router } from "./trpc";
import { manualResetCumulativeAmounts } from "../db";

export const systemRouter = router({
  health: publicProcedure
    .input(
      z.object({
        timestamp: z.number().min(0, "timestamp cannot be negative"),
      })
    )
    .query(() => ({
      ok: true,
    })),

  notifyOwner: adminProcedure
    .input(
      z.object({
        title: z.string().min(1, "title is required"),
        content: z.string().min(1, "content is required"),
      })
    )
    .mutation(async ({ input }) => {
      const delivered = await notifyOwner(input);
      return {
        success: delivered,
      } as const;
    }),

  resetCumulativeAmounts: adminProcedure
    .input(
      z.object({
        branchId: z.number().optional(),
      }).optional()
    )
    .mutation(async ({ input }) => {
      const result = await manualResetCumulativeAmounts(input?.branchId);
      return result;
    }),
});
