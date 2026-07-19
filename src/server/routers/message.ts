import { z } from "zod"
import { MessageType } from "@prisma/client"
import { router, protectedProcedure } from "../trpc"
import { TRPCError } from "@trpc/server"

export const messageRouter = router({
  list: protectedProcedure
    .input(z.object({
      roomId: z.string(),
      cursor: z.string().nullish(),
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ ctx, input }) => {
      const room = await ctx.prisma.room.findFirst({
        where: { id: input.roomId, userId: ctx.userId },
      })
      if (!room) throw new TRPCError({ code: "NOT_FOUND" })

      let messages
      try {
        messages = await ctx.prisma.message.findMany({
          where: { roomId: input.roomId },
          orderBy: { createdAt: "desc" },
          take: input.limit + 1,
          ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
          include: { checklistItems: { orderBy: { position: "asc" } } },
        })
      } catch {
        messages = await ctx.prisma.message.findMany({
          where: { roomId: input.roomId },
          orderBy: { createdAt: "desc" },
          take: input.limit + 1,
          include: { checklistItems: { orderBy: { position: "asc" } } },
        })
      }

      const hasMore = messages.length > input.limit
      if (hasMore) messages.pop()
      messages.reverse()

      return { messages, hasMore }
    }),

  send: protectedProcedure
    .input(z.object({
      roomId: z.string(),
      text: z.string().min(1),
      type: z.nativeEnum(MessageType).default(MessageType.TEXT),
      items: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const room = await ctx.prisma.room.findFirst({
        where: { id: input.roomId, userId: ctx.userId },
        select: { id: true },
      })
      if (!room) throw new TRPCError({ code: "NOT_FOUND" })

      const normalizedItems = (input.items ?? [])
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 20)

      if (input.type === MessageType.CHECKLIST && normalizedItems.length < 2) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Checklist membutuhkan minimal 2 item" })
      }

      return ctx.prisma.message.create({
        data: {
          text: input.text.trim(),
          type: input.type === MessageType.CHECKLIST ? MessageType.CHECKLIST : MessageType.TEXT,
          roomId: input.roomId,
          userId: ctx.userId,
          ...(input.type === MessageType.CHECKLIST && {
            checklistItems: {
              create: normalizedItems.map((item, position) => ({ text: item, position })),
            },
          }),
        },
        include: { checklistItems: { orderBy: { position: "asc" } } },
      })
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      text: z.string().optional(),
      remindSnoozeAt: z.string().nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input
      const data: Record<string, unknown> = { ...rest }

      if (typeof data.text === "string") {
        data.text = (data.text as string).trim()
        if (!data.text) throw new TRPCError({ code: "BAD_REQUEST", message: "Pesan tidak boleh kosong" })
        data.editedAt = new Date()
      }
      if (typeof data.remindSnoozeAt === "string") data.remindSnoozeAt = new Date(data.remindSnoozeAt as string)

      const owned = await ctx.prisma.message.findFirst({
        where: { id, userId: ctx.userId },
        select: { id: true, isDone: true, type: true },
      })
      if (!owned) throw new TRPCError({ code: "NOT_FOUND" })
      if ("text" in data && (owned.isDone || owned.type !== "TEXT")) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Pesan ini tidak dapat diedit" })
      }

      return ctx.prisma.message.update({ where: { id }, data })
    }),

  toggleDone: protectedProcedure
    .input(z.object({ id: z.string(), isDone: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.prisma.message.updateMany({
        where: { id: input.id, userId: ctx.userId },
        data: { isDone: input.isDone },
      })
      if (result.count === 0) throw new TRPCError({ code: "NOT_FOUND" })

      return ctx.prisma.message.findUniqueOrThrow({ where: { id: input.id } })
    }),

  togglePin: protectedProcedure
    .input(z.object({ id: z.string(), isPinned: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.prisma.message.updateMany({
        where: { id: input.id, userId: ctx.userId },
        data: { isPinned: input.isPinned },
      })
      if (result.count === 0) throw new TRPCError({ code: "NOT_FOUND" })

      return ctx.prisma.message.findUniqueOrThrow({ where: { id: input.id } })
    }),

  setReminder: protectedProcedure
    .input(z.object({ id: z.string(), remindAt: z.string().nullable() }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.prisma.message.updateMany({
        where: { id: input.id, userId: ctx.userId },
        data: {
          remindAt: input.remindAt ? new Date(input.remindAt) : null,
          isRemindDone: false,
        },
      })
      if (result.count === 0) throw new TRPCError({ code: "NOT_FOUND" })

      return ctx.prisma.message.findUniqueOrThrow({ where: { id: input.id } })
    }),

  markReminded: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.prisma.message.updateMany({
        where: { id: input.id, userId: ctx.userId },
        data: { isRemindDone: true },
      })
      if (result.count === 0) throw new TRPCError({ code: "NOT_FOUND" })

      return ctx.prisma.message.findUniqueOrThrow({ where: { id: input.id } })
    }),

  markRemindedAndDone: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.prisma.message.updateMany({
        where: { id: input.id, userId: ctx.userId },
        data: { isRemindDone: true, isDone: true },
      })
      if (result.count === 0) throw new TRPCError({ code: "NOT_FOUND" })

      return ctx.prisma.message.findUniqueOrThrow({ where: { id: input.id } })
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.prisma.message.deleteMany({
        where: { id: input.id, userId: ctx.userId },
      })
      if (result.count === 0) throw new TRPCError({ code: "NOT_FOUND" })

      return { success: true }
    }),

  updateChecklist: protectedProcedure
    .input(z.object({
      id: z.string(),
      title: z.string(),
      items: z.array(z.object({ text: z.string(), isDone: z.boolean() })),
    }))
    .mutation(async ({ ctx, input }) => {
      const normalizedTitle = input.title.trim()
      const normalizedItems = input.items
        .map((item) => ({ text: item.text.trim(), isDone: item.isDone }))
        .filter((item) => item.text)
        .slice(0, 20)

      if (!normalizedTitle || normalizedItems.length < 2) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Judul dan minimal 2 item wajib diisi" })
      }

      const message = await ctx.prisma.message.findFirst({
        where: { id: input.id, userId: ctx.userId, type: MessageType.CHECKLIST },
        select: { id: true },
      })
      if (!message) throw new TRPCError({ code: "NOT_FOUND" })

      return ctx.prisma.$transaction(async (tx) => {
        await tx.checklistItem.deleteMany({ where: { messageId: input.id } })
        await tx.message.update({
          where: { id: input.id },
          data: {
            text: normalizedTitle,
            isDone: normalizedItems.every((item) => item.isDone),
            checklistItems: { create: normalizedItems.map((item, position) => ({ ...item, position })) },
          },
        })
        return tx.message.findUniqueOrThrow({
          where: { id: input.id },
          include: { checklistItems: { orderBy: { position: "asc" } } },
        })
      })
    }),

  checkReminders: protectedProcedure
    .mutation(async ({ ctx }) => {
      const pendingReminders = await ctx.prisma.message.findMany({
        where: {
          userId: ctx.userId,
          isBot: false,
          isRemindDone: false,
          remindAt: { lte: new Date() },
          reminders: { none: {} },
        },
      })

      if (pendingReminders.length === 0) return []

      await ctx.prisma.message.createMany({
        data: pendingReminders.map((reminder) => ({
          text: "",
          isBot: true,
          sourceMessageId: reminder.id,
          roomId: reminder.roomId,
          userId: ctx.userId,
        })),
        skipDuplicates: true,
      })

      return ctx.prisma.message.findMany({
        where: {
          userId: ctx.userId,
          isBot: true,
          sourceMessageId: { in: pendingReminders.map((r) => r.id) },
        },
        include: { sourceMessage: true, checklistItems: { orderBy: { position: "asc" } } },
        orderBy: { createdAt: "asc" },
      })
    }),
})
