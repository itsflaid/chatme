import { z } from "zod"
import { router, protectedProcedure } from "../trpc"
import { TRPCError } from "@trpc/server"
import { getRoomsForUser } from "@/server/services/rooms"

export const roomRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return getRoomsForUser(ctx.prisma, ctx.userId)
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
      const result = await ctx.prisma.room.updateMany({
        where: { id: input.id, userId: ctx.userId },
        data: {
          ...(input.name && { name: input.name }),
          ...(input.icon && { icon: input.icon }),
          ...(input.description !== undefined && { description: input.description }),
        },
      })
      if (result.count === 0) throw new TRPCError({ code: "NOT_FOUND" })

      return ctx.prisma.room.findUniqueOrThrow({
        where: { id: input.id },
      })
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const room = await ctx.prisma.room.findFirst({
        where: { id: input.id, userId: ctx.userId },
        select: { id: true, name: true, icon: true, description: true },
      })
      if (!room) throw new TRPCError({ code: "NOT_FOUND" })
      return room
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.prisma.room.deleteMany({
        where: { id: input.id, userId: ctx.userId },
      })
      if (result.count === 0) throw new TRPCError({ code: "NOT_FOUND" })
      return { success: true }
    }),
})
