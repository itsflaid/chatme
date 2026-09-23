import { z } from "zod"
import { router, protectedProcedure, strictRateLimitedProcedure } from "../trpc"
import { TRPCError } from "@trpc/server"
import { getRoomsForUser } from "@/server/services/rooms"
import { DEFAULT_ROOM_ICON, ROOM_ICON_REGEX } from "@/lib/roomIcons"
import { MAX_PINNED_ROOMS, PIN_LIMIT_MESSAGE } from "@/lib/roomPin"

export const roomRouter = router({
  //list semua room user
  list: protectedProcedure.query(async ({ ctx }) => {
    return getRoomsForUser(ctx.prisma, ctx.userId)
  }),

  //buat room baru
  create: strictRateLimitedProcedure
    .input(z.object({
      name: z.string().min(1),
      icon: z.string().regex(ROOM_ICON_REGEX).optional(),
      description: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.room.create({
        data: {
          name: input.name,
          icon: input.icon || DEFAULT_ROOM_ICON,
          description: input.description || null,
          userId: ctx.userId,
        },
      })
    }),

  //edit room (nama/ikon/deskripsi)
  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().optional(),
      icon: z.string().regex(ROOM_ICON_REGEX).optional(),
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

  //ambil data room by id
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const room = await ctx.prisma.room.findFirst({
        where: { id: input.id, userId: ctx.userId },
        select: { id: true, name: true, icon: true, description: true, isPinned: true, pinnedAt: true },
      })
      if (!room) throw new TRPCError({ code: "NOT_FOUND" })
      return room
    }),

  //statistik lengkap room
  getInfo: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const room = await ctx.prisma.room.findFirst({
        where: { id: input.id, userId: ctx.userId },
        select: { id: true, name: true, icon: true, description: true, isPinned: true, pinnedAt: true, createdAt: true },
      })
      if (!room) throw new TRPCError({ code: "NOT_FOUND" })

      const baseWhere = { roomId: room.id, isBot: false }

      const [totalPesan, pesanDipin, reminderAktif, checklistTotal, checklistSelesai, lastMessage] =
        await Promise.all([
          ctx.prisma.message.count({ where: baseWhere }),
          ctx.prisma.message.count({ where: { ...baseWhere, isPinned: true } }),
          ctx.prisma.message.count({
            where: { ...baseWhere, remindAt: { not: null }, isRemindDone: false },
          }),
          ctx.prisma.checklistItem.count({ where: { message: baseWhere } }),
          ctx.prisma.checklistItem.count({ where: { message: baseWhere, isDone: true } }),
          ctx.prisma.message.findFirst({
            where: baseWhere,
            orderBy: { createdAt: "desc" },
            select: { createdAt: true },
          }),
        ])

      return {
        id: room.id,
        name: room.name,
        icon: room.icon,
        description: room.description,
        isPinned: room.isPinned,
        pinnedAt: room.pinnedAt,
        createdAt: room.createdAt,
        totalPesan,
        pesanDipin,
        reminderAktif,
        checklist: { total: checklistTotal, selesai: checklistSelesai },
        aktivitasTerakhir: lastMessage?.createdAt ?? null,
      }
    }),

  //pin / lepas pin room (maksimal MAX_PINNED_ROOMS)
  togglePin: protectedProcedure
    .input(z.object({ id: z.string(), isPinned: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      if (input.isPinned) {
        const room = await ctx.prisma.room.findFirst({
          where: { id: input.id, userId: ctx.userId },
          select: { id: true, isPinned: true },
        })
        if (!room) throw new TRPCError({ code: "NOT_FOUND" })
        if (!room.isPinned) {
          const pinnedCount = await ctx.prisma.room.count({
            where: { userId: ctx.userId, isPinned: true },
          })
          if (pinnedCount >= MAX_PINNED_ROOMS) {
            throw new TRPCError({ code: "BAD_REQUEST", message: PIN_LIMIT_MESSAGE })
          }
        }
      }
      const result = await ctx.prisma.room.updateMany({
        where: { id: input.id, userId: ctx.userId },
        data: { isPinned: input.isPinned, pinnedAt: input.isPinned ? new Date() : null },
      })
      if (result.count === 0) throw new TRPCError({ code: "NOT_FOUND" })

      return ctx.prisma.room.findUniqueOrThrow({
        where: { id: input.id },
      })
    }),

  //hapus room
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
