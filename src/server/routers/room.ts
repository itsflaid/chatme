import { z } from "zod"
import { router, protectedProcedure } from "../trpc"
import { TRPCError } from "@trpc/server"

export const roomRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const rawRooms = await ctx.prisma.room.findMany({
      where: { userId: ctx.userId },
      orderBy: { updatedAt: "desc" },
      include: {
        _count: {
          select: { messages: { where: { isDone: false, isBot: false } } },
        },
        messages: {
          where: { isBot: false },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { text: true, createdAt: true },
        },
      },
    })

    rawRooms.sort((a, b) => {
      const aActivity = a.messages[0]?.createdAt ?? a.createdAt
      const bActivity = b.messages[0]?.createdAt ?? b.createdAt
      return bActivity.getTime() - aActivity.getTime()
    })

    return rawRooms
  }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      icon: z.string().optional(),
      description: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.room.create({
        data: {
          name: input.name,
          icon: input.icon || "💬",
          description: input.description || null,
          userId: ctx.userId,
        },
      })
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().optional(),
      icon: z.string().optional(),
      description: z.string().nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const room = await ctx.prisma.room.findFirst({
        where: { id: input.id, userId: ctx.userId },
      })
      if (!room) throw new TRPCError({ code: "NOT_FOUND" })

      return ctx.prisma.room.update({
        where: { id: input.id },
        data: {
          ...(input.name && { name: input.name }),
          ...(input.icon && { icon: input.icon }),
          description: input.description ?? room.description,
        },
      })
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const room = await ctx.prisma.room.findFirst({
        where: { id: input.id, userId: ctx.userId },
      })
      if (!room) throw new TRPCError({ code: "NOT_FOUND" })

      await ctx.prisma.room.delete({ where: { id: input.id } })
      return { success: true }
    }),
})
