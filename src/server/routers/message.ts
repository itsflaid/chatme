import { z } from "zod"
import { MessageType } from "@prisma/client"
import { router, protectedProcedure, rateLimitedProcedure } from "../trpc"
import { TRPCError } from "@trpc/server"
import { EDIT_WINDOW_MS } from "@/lib/editWindow"
import { rescheduleReminderJob, cancelReminderJob } from "@/lib/reminderScheduler"
import { encryptField } from "@/lib/encryption"

export const messageRouter = router({
  //list catatan per room (pagination)
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

  //list catatan yang dipin
  listPinned: protectedProcedure
    .input(z.object({ roomId: z.string() }))
    .query(async ({ ctx, input }) => {
      const room = await ctx.prisma.room.findFirst({
        where: { id: input.roomId, userId: ctx.userId },
        select: { id: true },
      })
      if (!room) throw new TRPCError({ code: "NOT_FOUND" })

      return ctx.prisma.message.findMany({
        where: { roomId: input.roomId, isBot: false, isPinned: true },
        orderBy: { createdAt: "desc" },
        include: { checklistItems: { orderBy: { position: "asc" } } },
      })
    }),

  //list reminder yang masih aktif
  listActiveReminders: protectedProcedure
    .input(z.object({ roomId: z.string() }))
    .query(async ({ ctx, input }) => {
      const room = await ctx.prisma.room.findFirst({
        where: { id: input.roomId, userId: ctx.userId },
        select: { id: true },
      })
      if (!room) throw new TRPCError({ code: "NOT_FOUND" })

      return ctx.prisma.message.findMany({
        where: { roomId: input.roomId, isBot: false, remindAt: { not: null }, isRemindDone: false },
        orderBy: { remindAt: "asc" },
      })
    }),

  //kirim catatan / checklist baru
  send: rateLimitedProcedure
    .input(z.object({
      roomId: z.string(),
      text: z.string().min(1).max(10000),
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
          text: encryptField(input.text.trim()),
          type: input.type === MessageType.CHECKLIST ? MessageType.CHECKLIST : MessageType.TEXT,
          roomId: input.roomId,
          userId: ctx.userId,
          ...(input.type === MessageType.CHECKLIST && {
            checklistItems: {
              create: normalizedItems.map((item, position) => ({ text: encryptField(item), position })),
            },
          }),
        },
        include: { checklistItems: { orderBy: { position: "asc" } } },
      })
    }),

  //edit teks catatan / snooze reminder
  update: rateLimitedProcedure
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
        if (!data.text) throw new TRPCError({ code: "BAD_REQUEST", message: "Catatan tidak boleh kosong" })
        data.editedAt = new Date()
      }
      if (typeof data.remindSnoozeAt === "string") data.remindSnoozeAt = new Date(data.remindSnoozeAt as string)
      if ("remindSnoozeAt" in data) data.remindNotifiedAt = null

      const owned = await ctx.prisma.message.findFirst({
        where: { id, userId: ctx.userId },
        select: { id: true, taskStatus: true, type: true, createdAt: true },
      })
      if (!owned) throw new TRPCError({ code: "NOT_FOUND" })
      if ("text" in data && (owned.taskStatus !== "PENDING" || owned.type !== "TEXT")) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Catatan ini tidak dapat diedit" })
      }
      if ("text" in data && Date.now() - owned.createdAt.getTime() > EDIT_WINDOW_MS) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Batas waktu edit (24 jam) sudah lewat" })
      }

      // Enkripsi PALING TERAKHIR, setelah semua validasi di atas jalan di teks asli (plaintext) —
      // termasuk pengecekan kosong & window edit 24 jam.
      if (typeof data.text === "string") {
        data.text = encryptField(data.text as string)
      }

      return ctx.prisma.message.update({ where: { id }, data })
    }),

  //tandai catatan selesai/belum
  toggleDone: protectedProcedure
    .input(z.object({ id: z.string(), status: z.enum(["PENDING", "DONE", "NOT_DONE"]) }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.prisma.message.updateMany({
        where: { id: input.id, userId: ctx.userId },
        data: { taskStatus: input.status },
      })
      if (result.count === 0) throw new TRPCError({ code: "NOT_FOUND" })

      return ctx.prisma.message.findUniqueOrThrow({ where: { id: input.id } })
    }),

  //pin / lepas pin catatan
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

  //set / hapus reminder
  setReminder: protectedProcedure
    .input(z.object({ id: z.string(), remindAt: z.string().nullable() }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.prisma.message.updateMany({
        where: { id: input.id, userId: ctx.userId },
        data: {
          remindAt: input.remindAt ? new Date(input.remindAt) : null,
          isRemindDone: false,
          remindNotifiedAt: null,
          // Naikkan versi tiap kali remindAt berubah, biar job QStash lama (kalau ada)
          // otomatis dianggap basi oleh endpoint /api/reminders/trigger.
          reminderVersion: { increment: 1 },
        },
      })
      if (result.count === 0) throw new TRPCError({ code: "NOT_FOUND" })

      const updated = await ctx.prisma.message.findUniqueOrThrow({ where: { id: input.id } })
      // Batalkan job lama (kalau ada) & jadwalkan job baru sesuai remindAt terkini.
      // Best-effort — gagal publish ke QStash gak nge-gagalin mutation ini.
      await rescheduleReminderJob(ctx.prisma, updated)

      return updated
    }),

  //tandai sudah diingatkan
  markReminded: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.prisma.message.updateMany({
        where: { id: input.id, userId: ctx.userId },
        data: { isRemindDone: true },
      })
      if (result.count === 0) throw new TRPCError({ code: "NOT_FOUND" })

      const updated = await ctx.prisma.message.findUniqueOrThrow({ where: { id: input.id } })
      await cancelReminderJob(ctx.prisma, updated)

      return updated
    }),

  //tandai sudah diingatkan + selesai sekaligus
  markRemindedAndDone: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.prisma.message.updateMany({
        where: { id: input.id, userId: ctx.userId },
        data: { isRemindDone: true, taskStatus: "DONE" },
      })
      if (result.count === 0) throw new TRPCError({ code: "NOT_FOUND" })

      const updated = await ctx.prisma.message.findUniqueOrThrow({ where: { id: input.id } })
      await cancelReminderJob(ctx.prisma, updated)

      return updated
    }),

    //hapus smua catatan (note user, bot message dibiarkan)
  clearAll: protectedProcedure
  .input(z.object({ roomId: z.string() }))
  .mutation(async ({ ctx, input }) => {
    const room = await ctx.prisma.room.findFirst({
      where: { id: input.roomId, userId: ctx.userId },
      select: { id: true },
    })
    if (!room) throw new TRPCError({ code: "NOT_FOUND" })

    await ctx.prisma.message.deleteMany({
      where: { roomId: input.roomId, isBot: false },
    })

    return { success: true }
  }),

  //hapus smua bot message (riwayat pengingat), note user dibiarkan
  clearBotMessages: protectedProcedure
  .input(z.object({ roomId: z.string() }))
  .mutation(async ({ ctx, input }) => {
    const room = await ctx.prisma.room.findFirst({
      where: { id: input.roomId, userId: ctx.userId },
      select: { id: true },
    })
    if (!room) throw new TRPCError({ code: "NOT_FOUND" })

    await ctx.prisma.message.deleteMany({
      where: { roomId: input.roomId, isBot: true },
    })

    return { success: true }
  }),

  //hapus satu catatan
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Batalkan job reminder yang lagi pending (kalau ada) sebelum baris-nya hilang,
      // biar gak ada job QStash nganggur nunjuk ke message yang udah kehapus.
      const existing = await ctx.prisma.message.findFirst({
        where: { id: input.id, userId: ctx.userId },
        select: { id: true, remindQstashId: true },
      })
      if (existing) await cancelReminderJob(ctx.prisma, existing)

      await ctx.prisma.message.deleteMany({
        where: { id: input.id, userId: ctx.userId },
      })

      return { success: true }
    }),

  //edit ulang judul & item checklist
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
        select: { id: true, createdAt: true },
      })
      if (!message) throw new TRPCError({ code: "NOT_FOUND" })
      if (Date.now() - message.createdAt.getTime() > EDIT_WINDOW_MS) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Batas waktu edit (24 jam) sudah lewat" })
      }

      return ctx.prisma.$transaction(async (tx) => {
        await tx.checklistItem.deleteMany({ where: { messageId: input.id } })
        await tx.message.update({
          where: { id: input.id },
          data: {
            text: encryptField(normalizedTitle),
            taskStatus: normalizedItems.every((item) => item.isDone) ? "DONE" : "PENDING",
            checklistItems: {
              create: normalizedItems.map((item, position) => ({
                ...item,
                text: encryptField(item.text),
                position,
              })),
            },
          },
        })
        return tx.message.findUniqueOrThrow({
          where: { id: input.id },
          include: { checklistItems: { orderBy: { position: "asc" } } },
        })
      })
    }),
})