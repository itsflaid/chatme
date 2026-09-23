"use client"

import { useCallback, useEffect } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { trpc } from "@/lib/trpc"
import { getQueryKey } from "@trpc/react-query"
import { broadcastInvalidate } from "@/lib/broadcastSync"
import { MessageType } from "@prisma/client"
import {
  addOutboxItem,
  updateOutboxItem,
  removeOutboxItem,
  OUTBOX_KEY,
  MAX_RATE_LIMIT_RETRIES,
  RATE_LIMIT_BACKOFF_BASE_MS,
  type OutboxItem,
} from "@/lib/outbox"
import { classifySendError } from "@/lib/sendErrorClassifier"
import type { ChatMessage } from "@/types/chat"
import type { RoomData } from "./useRooms"

// ── Query key helpers ───────────────────────────────────────────────────
//
// PENTING: `queryClient.setQueryData(key, ...)` butuh key yang PERSIS SAMA
// (exact hash match) dengan key yang dipakai hook query aslinya — beda
// dengan `invalidateQueries` yang partial-match. `getQueryKey()` dari
// @trpc/react-query men-generate key berdasarkan INPUT LENGKAP yang dipakai
// hook (untuk infinite query, cuma `cursor`/`direction` yang di-strip —
// field lain seperti `limit` tetap masuk key). Kalau input yang dikasih ke
// getQueryKey() di sini beda dari input yang dikasih ke useInfiniteQuery/
// useQuery di komponen, hasilnya adalah entry cache lain yang tidak
// disubscribe siapa pun → setQueryData jadi no-op diam-diam.
//
// Makanya SEMUA tempat yang butuh key untuk message.list / room.list WAJIB
// pakai 2 helper ini, jangan panggil getQueryKey() manual lagi.

export const MESSAGES_LIMIT = 50

export function getMessagesKey(roomId: string) {
  return getQueryKey(trpc.message.list, { roomId, limit: MESSAGES_LIMIT }, "infinite")
}

export function getRoomsKey() {
  return getQueryKey(trpc.room.list, undefined, "query")
}

// ── Read query ──────────────────────────────────────────────────────────

export function useMessagesQuery(roomId: string) {
  return trpc.message.list.useInfiniteQuery(
    { roomId, limit: MESSAGES_LIMIT },
    {
      getNextPageParam: (lastPage) =>
        lastPage.hasMore ? lastPage.messages[0]?.id : undefined,
      select: (data) => {
        const all = data.pages.flatMap((p) => p.messages)
        const unique = new Map(all.map((m) => [m.id, m]))
        return [...unique.values()].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        )
      },
    }
  )
}

// ── Room info queries ───────────────────────────────────────────────────

export function useRoomPinnedMessages(roomId: string, enabled: boolean) {
  return trpc.message.listPinned.useQuery({ roomId }, { enabled })
}

export function useRoomActiveReminders(roomId: string, enabled: boolean) {
  return trpc.message.listActiveReminders.useQuery({ roomId }, { enabled })
}

// ── Mutation helpers ────────────────────────────────────────────────────

type MessagesPageData = {
  pageParams: unknown[]
  pages: { messages: ChatMessage[]; hasMore: boolean }[]
}

export function updateMessagesCache(
  queryClient: ReturnType<typeof useQueryClient>,
  messagesKey: ReturnType<typeof getQueryKey>,
  updater: (messages: ChatMessage[]) => ChatMessage[]
) {
  queryClient.setQueryData(messagesKey, (old: MessagesPageData | undefined) => {
    if (!old) return old
    const pages = old.pages.map((page) => {
      const nextMessages = updater(page.messages)
      const unchanged =
        nextMessages.length === page.messages.length &&
        nextMessages.every((m, i) => m === page.messages[i])
      return unchanged ? page : { ...page, messages: nextMessages }
    })
    return { ...old, pages }
  })
}

export function updateMessagesCacheFlatten(
  queryClient: ReturnType<typeof useQueryClient>,
  messagesKey: ReturnType<typeof getQueryKey>,
  updater: (messages: ChatMessage[]) => ChatMessage[]
) {
  queryClient.setQueryData(messagesKey, (old: MessagesPageData | undefined) => {
    if (!old) {
      // Room baru yg initial message.list-nya BELUM selesai fetch (misal:
      // user langsung ngirim pesan pertama begitu masuk room). Tanpa ini,
      // optimistic update di bawah jadi no-op diam2 (gak ada page buat
      // diisi) -> pesan pertama "ilang" sampe ada refetch lain yg gak
      // dijamin kejadian. Seed 1 page kosong dulu biar update-nya nempel.
      const seeded = updater([])
      return { pageParams: [undefined], pages: [{ messages: seeded, hasMore: false }] }
    }
    const all = old.pages.flatMap((p) => p.messages)
    const updated = updater(all)
    const pageSize = old.pages[old.pages.length - 1]?.messages.length || MESSAGES_LIMIT
    const pages: { messages: ChatMessage[]; hasMore: boolean }[] = []
    for (let i = 0; i < updated.length; i += pageSize) {
      pages.push({ messages: updated.slice(i, i + pageSize), hasMore: true })
    }
    if (pages.length > 0) pages[pages.length - 1].hasMore = old.pages[old.pages.length - 1]?.hasMore ?? false
    return { ...old, pages }
  })
}

function updateSidebarPreview(
  queryClient: ReturnType<typeof useQueryClient>,
  roomsKey: ReturnType<typeof getQueryKey>,
  roomId: string,
  preview: { text: string; createdAt: Date } | null
) {
  queryClient.setQueryData(roomsKey, (old: RoomData[] | undefined) => {
    if (!old) return old
    const updated = old.map((r) =>
      r.id === roomId
        ? { ...r, messages: preview ? [preview] : [] }
        : r
    )
    updated.sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1
      if (a.isPinned && b.isPinned) {
        return (b.pinnedAt?.getTime() ?? 0) - (a.pinnedAt?.getTime() ?? 0)
      }
      const aTime = a.messages[0]?.createdAt?.getTime() ?? 0
      const bTime = b.messages[0]?.createdAt?.getTime() ?? 0
      return bTime - aTime
    })
    return updated
  })
}

// Patch langsung angka "belum selesai" (_count.messages) di cache room.list.
// BroadcastChannel.postMessage gak nyampe ke tab pengirim sendiri, jadi tanpa
// ini badge di tab aktif gak pernah ke-update realtime. Broadcast invalidate
// yang lama tetap jalan buat sync antar tab.
function adjustRoomUnfinishedCount(
  queryClient: ReturnType<typeof useQueryClient>,
  roomsKey: ReturnType<typeof getQueryKey>,
  roomId: string,
  delta: number
) {
  queryClient.setQueryData(roomsKey, (old: RoomData[] | undefined) => {
    if (!old) return old
    return old.map((r) =>
      r.id === roomId
        ? { ...r, _count: { ...r._count, messages: Math.max(0, r._count.messages + delta) } }
        : r
    )
  })
}

function getMessagesFromCache(
  queryClient: ReturnType<typeof useQueryClient>,
  messagesKey: ReturnType<typeof getQueryKey>
): ChatMessage[] {
  const data = queryClient.getQueryData<MessagesPageData>(messagesKey)
  return data?.pages.flatMap((p) => p.messages) ?? []
}

// Hitung ulang pesan terakhir yg masih ada di cache messages saat ini,
// lalu sinkronkan ke preview sidebar room list — dipanggil tiap kali ada
// delete/undo delete, biar sidebar ikut berubah realtime tanpa refresh.
function syncSidebarPreview(
  queryClient: ReturnType<typeof useQueryClient>,
  messagesKey: ReturnType<typeof getQueryKey>,
  roomsKey: ReturnType<typeof getQueryKey>,
  roomId: string
) {
  const messages = getMessagesFromCache(queryClient, messagesKey)
  const visible = messages.filter((m) => !m.isBot)
  const latest = visible.reduce<ChatMessage | null>(
    (a, b) => (!a || new Date(b.createdAt) > new Date(a.createdAt) ? b : a),
    null
  )
  updateSidebarPreview(
    queryClient,
    roomsKey,
    roomId,
    latest ? { text: latest.text, createdAt: new Date(latest.createdAt) } : null
  )
}

// ── Send message ────────────────────────────────────────────────────────

export function useSendMessage(roomId: string) {
  const queryClient = useQueryClient()
  const messagesKey = getMessagesKey(roomId)
  const roomsKey = getRoomsKey()

  return trpc.message.send.useMutation({
    networkMode: "always",
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: messagesKey })
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const now = new Date()
      const tempMessage: ChatMessage = {
        tempId,
        id: tempId,
        text: input.text,
        type: input.type ?? MessageType.TEXT,
        taskStatus: "PENDING",
        isPinned: false,
        isBot: false,
        remindAt: null,
        remindSnoozeAt: null,
        remindNotifiedAt: null,
        isRemindDone: false,
        reminderVersion: 0,
        remindQstashId: null,
        sourceMessageId: null,
        roomId: input.roomId,
        userId: "",
        createdAt: now,
        updatedAt: now,
        editedAt: null,
        checklistItems: input.items?.map((item, position) => ({
          id: `${tempId}-${position}`,
          text: item,
          isDone: false,
          position,
          messageId: tempId,
          createdAt: now,
          updatedAt: now,
        })) ?? [],
      }

      updateMessagesCacheFlatten(queryClient, messagesKey, (msgs) => [...msgs, tempMessage])
      return { tempId }
    },
    onSuccess: (realMessage, _input, context) => {
      updateMessagesCacheFlatten(queryClient, messagesKey, (msgs) =>
        msgs.map((m) => (m.id === context?.tempId ? { ...realMessage, tempId: context.tempId } : m))
      )
      updateSidebarPreview(queryClient, roomsKey, roomId, {
        text: realMessage.text,
        createdAt: new Date(realMessage.createdAt),
      })
      if (realMessage.type !== MessageType.CHECKLIST) {
        adjustRoomUnfinishedCount(queryClient, roomsKey, roomId, +1)
      }
      broadcastInvalidate(roomsKey)
    },
    onError: (err, input, context) => {
      if (!context?.tempId) return

      if (input.type === MessageType.CHECKLIST) {
        updateMessagesCacheFlatten(queryClient, messagesKey, (msgs) =>
          msgs.filter((m) => m.id !== context.tempId)
        )
        return
      }

      const kind = classifySendError(err)
      const base = {
        tempId: context.tempId,
        roomId: input.roomId,
        text: input.text,
        type: "TEXT" as const,
        createdAt: new Date().toISOString(),
      }

      if (kind === "offline") {
        addOutboxItem(queryClient, { ...base, status: "pending", retryCount: 0, nextRetryAt: null, lastError: null })
        return
      }
      if (kind === "rate-limit") {
        addOutboxItem(queryClient, {
          ...base, status: "pending", retryCount: 1,
          nextRetryAt: new Date(Date.now() + RATE_LIMIT_BACKOFF_BASE_MS).toISOString(),
          lastError: null,
        })
        return
      }
      addOutboxItem(queryClient, {
        ...base, status: "failed", retryCount: 0, nextRetryAt: null,
        lastError: err instanceof Error ? err.message : "Gagal mengirim",
      })
    },
  })
}

// ── Outbox ───────────────────────────────────────────────────────────────

export function useOutboxQuery() {
  return useQuery<OutboxItem[]>({
    queryKey: OUTBOX_KEY,
    queryFn: () => [],
    initialData: [],
    staleTime: Infinity,
    gcTime: Infinity,
  })
}

function buildTempTextMessage(tempId: string, roomId: string, text: string, now: Date): ChatMessage {
  return {
    tempId, id: tempId, text,
    type: MessageType.TEXT, taskStatus: "PENDING",
    isPinned: false, isBot: false,
    remindAt: null, remindSnoozeAt: null, remindNotifiedAt: null, isRemindDone: false,
    reminderVersion: 0, remindQstashId: null,
    sourceMessageId: null, roomId, userId: "",
    createdAt: now, updatedAt: now, editedAt: null,
    checklistItems: [],
  }
}

export function useReplayOutboxIntoRoom(roomId: string, ready: boolean) {
  const queryClient = useQueryClient()
  const messagesKey = getMessagesKey(roomId)
  const { data: outbox } = useOutboxQuery()

  useEffect(() => {
    if (!ready) return
    const pendingForRoom = (outbox ?? []).filter((it) => it.roomId === roomId)
    if (pendingForRoom.length === 0) return

    const currentIds = new Set(getMessagesFromCache(queryClient, messagesKey).map((m) => m.id))
    const missing = pendingForRoom.filter((it) => !currentIds.has(it.tempId))
    if (missing.length === 0) return

    updateMessagesCacheFlatten(queryClient, messagesKey, (msgs) => [
      ...msgs,
      ...missing.map((it) => buildTempTextMessage(it.tempId, roomId, it.text, new Date(it.createdAt))),
    ])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, roomId, outbox, queryClient])
}

export async function attemptSendOutboxItem(
  utils: ReturnType<typeof trpc.useUtils>,
  queryClient: ReturnType<typeof useQueryClient>,
  item: OutboxItem
) {
  const messagesKey = getMessagesKey(item.roomId)
  const roomsKey = getRoomsKey()

  updateOutboxItem(queryClient, item.tempId, { status: "sending" })

  try {
    const real = await utils.client.message.send.mutate({
      roomId: item.roomId, text: item.text, type: MessageType.TEXT,
    })

    updateMessagesCacheFlatten(queryClient, messagesKey, (msgs) =>
      msgs.map((m) => (m.id === item.tempId ? { ...real, tempId: item.tempId } : m))
    )
    updateSidebarPreview(queryClient, roomsKey, item.roomId, {
      text: real.text, createdAt: new Date(real.createdAt),
    })
    adjustRoomUnfinishedCount(queryClient, roomsKey, item.roomId, +1)
    broadcastInvalidate(roomsKey)

    removeOutboxItem(queryClient, item.tempId)
  } catch (err) {
    const kind = classifySendError(err)

    if (kind === "offline") {
      updateOutboxItem(queryClient, item.tempId, { status: "pending" })
      return
    }
    if (kind === "rate-limit") {
      const nextCount = item.retryCount + 1
      if (nextCount > MAX_RATE_LIMIT_RETRIES) {
        updateOutboxItem(queryClient, item.tempId, {
          status: "failed", retryCount: nextCount, lastError: "Terlalu banyak percobaan",
        })
        return
      }
      updateOutboxItem(queryClient, item.tempId, {
        status: "pending", retryCount: nextCount,
        nextRetryAt: new Date(Date.now() + RATE_LIMIT_BACKOFF_BASE_MS * 2 ** (nextCount - 1)).toISOString(),
      })
      return
    }
    updateOutboxItem(queryClient, item.tempId, {
      status: "failed", lastError: err instanceof Error ? err.message : "Gagal mengirim",
    })
  }
}

export function useCancelOutboxMessage() {
  const queryClient = useQueryClient()
  return useCallback((tempId: string, roomId: string) => {
    const messagesKey = getMessagesKey(roomId)
    const roomsKey = getRoomsKey()

    removeOutboxItem(queryClient, tempId)
    updateMessagesCacheFlatten(queryClient, messagesKey, (msgs) => msgs.filter((m) => m.id !== tempId))
    syncSidebarPreview(queryClient, messagesKey, roomsKey, roomId)
  }, [queryClient])
}

export function useRetryOutboxMessage() {
  const queryClient = useQueryClient()
  return useCallback((tempId: string) => {
    updateOutboxItem(queryClient, tempId, { status: "pending", nextRetryAt: null })
  }, [queryClient])
}

// ── Edit message ────────────────────────────────────────────────────────

export function useEditMessage(roomId: string) {
  const queryClient = useQueryClient()
  const messagesKey = getMessagesKey(roomId)
  const roomsKey = getRoomsKey()

  return trpc.message.update.useMutation({
    onSuccess: (updated) => {
      updateMessagesCache(queryClient, messagesKey, (msgs) =>
        msgs.map((m) =>
          m.id === updated.id ? { ...m, text: updated.text, editedAt: updated.editedAt } : m
        )
      )

      const allMsgs = getMessagesFromCache(queryClient, messagesKey)
      const latest = allMsgs.reduce((a, b) =>
        new Date(a.createdAt) > new Date(b.createdAt) ? a : b
      , allMsgs[0])

      if (latest?.id === updated.id) {
        updateSidebarPreview(queryClient, roomsKey, roomId, {
          text: updated.text,
          createdAt: new Date(updated.createdAt),
        })
        broadcastInvalidate(roomsKey)
      }
    },
  })
}

// ── Delete message ───────────────────────────────────────────────────────
//
// Klik hapus -> pesan LANGSUNG hilang dari chat + preview sidebar
// (optimistic, gak ada bubble "Pesan telah dihapus"). Penghapusan
// permanen di server baru beneran dieksekusi kalau commitDelete()
// dipanggil (dari timer undo-toast di ChatContainer). Kalau user pencet
// "Urungkan" sebelum itu, restoreToView() cukup masukin lagi objek pesan
// yg sama ke cache — gak ada request ke server sama sekali karena
// belum pernah beneran kehapus.

export function useDeleteMessage(roomId: string) {
  const queryClient = useQueryClient()
  const messagesKey = getMessagesKey(roomId)
  const roomsKey = getRoomsKey()

  const mutation = trpc.message.delete.useMutation({
    onSuccess: () => {
      broadcastInvalidate(messagesKey)
      broadcastInvalidate(roomsKey)
    },
  })

  const removeFromView = useCallback((messageId: string): ChatMessage | null => {
    const current = getMessagesFromCache(queryClient, messagesKey)
    const removed = current.find((m) => m.id === messageId) ?? null
    updateMessagesCacheFlatten(queryClient, messagesKey, (msgs) =>
      msgs.filter((m) => m.id !== messageId)
    )
    if (removed && removed.taskStatus === "PENDING" && removed.type !== MessageType.CHECKLIST) {
      adjustRoomUnfinishedCount(queryClient, roomsKey, roomId, -1)
    }
    syncSidebarPreview(queryClient, messagesKey, roomsKey, roomId)
    return removed
  }, [queryClient, messagesKey, roomsKey, roomId])

  const restoreToView = useCallback((message: ChatMessage) => {
    updateMessagesCacheFlatten(queryClient, messagesKey, (msgs) => [...msgs, message])
    if (message.taskStatus === "PENDING" && message.type !== MessageType.CHECKLIST) {
      adjustRoomUnfinishedCount(queryClient, roomsKey, roomId, +1)
    }
    syncSidebarPreview(queryClient, messagesKey, roomsKey, roomId)
  }, [queryClient, messagesKey, roomsKey, roomId])

  const commitDelete = useCallback((messageId: string) => {
    mutation.mutate({ id: messageId })
  }, [mutation])

  const deleteAsync = useCallback((messageId: string) => {
    return mutation.mutateAsync({ id: messageId })
  }, [mutation])

  return { removeFromView, restoreToView, commitDelete, deleteAsync }
}

// ── Clear all messages in room ──────────────────────────────────────────

export function useClearMessages(roomId: string) {
  const queryClient = useQueryClient()
  const messagesKey = getMessagesKey(roomId)
  const roomsKey = getRoomsKey()

  return trpc.message.clearAll.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: messagesKey })
      queryClient.invalidateQueries({ queryKey: roomsKey })
    },
  })
}

// ── Clear bot messages (riwayat pengingat) in room ─────────────────────

export function useClearBotMessages(roomId: string) {
  const queryClient = useQueryClient()
  const messagesKey = getMessagesKey(roomId)
  const roomsKey = getRoomsKey()

  return trpc.message.clearBotMessages.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: messagesKey })
      queryClient.invalidateQueries({ queryKey: roomsKey })
    },
  })
}

// ── Toggle done ─────────────────────────────────────────────────────────

export function useToggleDone(roomId: string) {
  const queryClient = useQueryClient()
  const messagesKey = getMessagesKey(roomId)
  const roomsKey = getRoomsKey()

  return trpc.message.toggleDone.useMutation({
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: messagesKey })
      const previous = queryClient.getQueryData(messagesKey)
      const prevMessage = getMessagesFromCache(queryClient, messagesKey).find((m) => m.id === id)
      updateMessagesCache(queryClient, messagesKey, (msgs) =>
        msgs.map((m) => (m.id === id ? { ...m, taskStatus: status } : m))
      )
      const wasPending = prevMessage ? prevMessage.taskStatus === "PENDING" : false
      const nowPending = status === "PENDING"
      if (wasPending && !nowPending) adjustRoomUnfinishedCount(queryClient, roomsKey, roomId, -1)
      if (!wasPending && nowPending) adjustRoomUnfinishedCount(queryClient, roomsKey, roomId, +1)
      return { previous }
    },
    onSuccess: (updated) => {
      updateMessagesCache(queryClient, messagesKey, (msgs) =>
        msgs.map((m) => (m.id === updated.id ? { ...m, taskStatus: updated.taskStatus } : m))
      )
      broadcastInvalidate(messagesKey)
    },
    onError: (_err, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(messagesKey, context.previous)
    },
  })
}

// ── Toggle pin ──────────────────────────────────────────────────────────

export function useTogglePin(roomId: string) {
  const queryClient = useQueryClient()
  const messagesKey = getMessagesKey(roomId)

  return trpc.message.togglePin.useMutation({
    onMutate: async ({ id, isPinned }) => {
      await queryClient.cancelQueries({ queryKey: messagesKey })
      const previous = queryClient.getQueryData(messagesKey)
      updateMessagesCache(queryClient, messagesKey, (msgs) =>
        msgs.map((m) => (m.id === id ? { ...m, isPinned } : m))
      )
      return { previous }
    },
    onSuccess: () => {
      broadcastInvalidate(messagesKey)
    },
    onError: (_err, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(messagesKey, context.previous)
    },
  })
}

// ── Set reminder ────────────────────────────────────────────────────────

export function useSetReminder(roomId: string) {
  const queryClient = useQueryClient()
  const messagesKey = getMessagesKey(roomId)

  return trpc.message.setReminder.useMutation({
    onMutate: async ({ id, remindAt }) => {
      await queryClient.cancelQueries({ queryKey: messagesKey })
      const previous = queryClient.getQueryData(messagesKey)
      updateMessagesCache(queryClient, messagesKey, (msgs) =>
        msgs.map((m) =>
          m.id === id ? { ...m, remindAt: remindAt ? new Date(remindAt) : null, isRemindDone: false } : m
        )
      )
      return { previous }
    },
    onSuccess: () => {
      broadcastInvalidate(messagesKey)
    },
    onError: (_err, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(messagesKey, context.previous)
    },
  })
}

// ── Mark reminded ───────────────────────────────────────────────────────

export function useMarkReminded(roomId: string) {
  const queryClient = useQueryClient()
  const messagesKey = getMessagesKey(roomId)

  return trpc.message.markReminded.useMutation({
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: messagesKey })
      const previous = queryClient.getQueryData(messagesKey)
      updateMessagesCache(queryClient, messagesKey, (msgs) =>
        msgs.map((m) => (m.id === id ? { ...m, isRemindDone: true } : m))
      )
      return { previous }
    },
    onSuccess: () => {
      broadcastInvalidate(messagesKey)
    },
    onError: (_err, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(messagesKey, context.previous)
    },
  })
}

// ── Mark reminded and done (combined) ───────────────────────────────────

export function useMarkRemindedAndDone(roomId: string) {
  const queryClient = useQueryClient()
  const messagesKey = getMessagesKey(roomId)
  const roomsKey = getRoomsKey()

  return trpc.message.markRemindedAndDone.useMutation({
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: messagesKey })
      const previous = queryClient.getQueryData(messagesKey)
      const prevMessage = getMessagesFromCache(queryClient, messagesKey).find((m) => m.id === id)
      updateMessagesCache(queryClient, messagesKey, (msgs) =>
        msgs.map((m) => (m.id === id ? { ...m, isRemindDone: true, taskStatus: "DONE" } : m))
      )
      if (prevMessage && prevMessage.taskStatus === "PENDING" && prevMessage.type !== MessageType.CHECKLIST) {
        adjustRoomUnfinishedCount(queryClient, roomsKey, roomId, -1)
      }
      return { previous }
    },
    onSuccess: () => {
      broadcastInvalidate(messagesKey)
    },
    onError: (_err, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(messagesKey, context.previous)
    },
  })
}

// ── Checklist toggle item ───────────────────────────────────────────────

export function useChecklistToggle(roomId: string) {
  const queryClient = useQueryClient()
  const messagesKey = getMessagesKey(roomId)

  return trpc.message.updateChecklist.useMutation({
    onMutate: async ({ id, items }) => {
      await queryClient.cancelQueries({ queryKey: messagesKey })
      const previous = queryClient.getQueryData(messagesKey)
      const allDone = items.every((i) => i.isDone)
      const nextStatus = allDone ? "DONE" : "PENDING"
      updateMessagesCache(queryClient, messagesKey, (msgs) =>
        msgs.map((m) =>
          m.id === id
            ? { ...m, checklistItems: m.checklistItems.map((ci) => {
                const updated = items.find((i) => i.text === ci.text)
                return updated ? { ...ci, isDone: updated.isDone } : ci
              }), taskStatus: nextStatus }
            : m
        )
      )
      // checklist gak dihitung di badge "belum selesai" room list.
      return { previous }
    },
    onSuccess: (updated) => {
      updateMessagesCache(queryClient, messagesKey, (msgs) =>
        msgs.map((m) =>
          m.id === updated.id
            ? { ...m, text: updated.text, taskStatus: updated.taskStatus, checklistItems: updated.checklistItems }
            : m
        )
      )
      broadcastInvalidate(messagesKey)
    },
    onError: (_err, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(messagesKey, context.previous)
    },
  })
}

// ── Checklist item toggle individual ────────────────────────────────────

export function useToggleChecklistItem() {
  return trpc.checklistItem.toggle.useMutation()
}

// ── Checklist item toggle with optimistic cache update ──────────────────

export function useToggleChecklistItemOptimistic(roomId: string) {
  const queryClient = useQueryClient()
  const messagesKey = getMessagesKey(roomId)
  const toggleItem = useToggleChecklistItem()

  const optimisticToggle = useCallback(
    (messageId: string, prevItems: ChatMessage['checklistItems'], itemId: string, isDone: boolean) => {
      const nextItems = prevItems.map((item) =>
        item.id === itemId ? { ...item, isDone } : item
      )
      const nextStatus = nextItems.every((item) => item.isDone) ? "DONE" : "PENDING"

      updateMessagesCache(queryClient, messagesKey, (msgs) =>
        msgs.map((m) =>
          m.id === messageId
            ? { ...m, checklistItems: nextItems, taskStatus: nextStatus }
            : m
        )
      )

      // checklist gak dihitung di badge "belum selesai" room list.

      toggleItem.mutate(
        { id: itemId, isDone },
        {
          onError: () => {
            updateMessagesCache(queryClient, messagesKey, (msgs) =>
              msgs.map((m) =>
                m.id === messageId
                  ? { ...m, checklistItems: prevItems, taskStatus: prevItems.every((i) => i.isDone) ? "DONE" : "PENDING" }
                  : m
              )
            )
          },
        }
      )
    },
    [queryClient, messagesKey, toggleItem]
  )

  return { optimisticToggle, toggleItem }
}