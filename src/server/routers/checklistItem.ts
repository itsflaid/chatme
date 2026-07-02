import { z } from "zod"
import { router, protectedProcedure } from "../trpc"
import { TRPCError } from "@trpc/server"

export const checklistItemRouter = router({
  toggle: protectedProcedure
    .input(z.object({ id: z.string(), isDone: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const item = await ctx.prisma.checklistItem.findFirst({
        where: { id: input.id, message: { userId: ctx.userId } },
        select: { id: true },
      })
      if (!item) throw new TRPCError({ code: "NOT_FOUND" })

      return ctx.prisma.$transaction(async (tx) => {
        const updated = await tx.checklistItem.update({
          where: { id: input.id },
          data: { isDone: input.isDone },
        })
        const remaining = await tx.checklistItem.count({
          where: { messageId: updated.messageId, isDone: false },
        })
        await tx.message.update({
          where: { id: updated.messageId },
          data: { isDone: remaining === 0 },
        })
        return { item: updated, messageIsDone: remaining === 0 }
      })
    }),
})
