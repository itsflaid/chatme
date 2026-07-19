"use client"

import { useCallback, useRef } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { trpc } from "@/lib/trpc"
import { getQueryKey } from "@trpc/react-query"
import { broadcastInvalidate } from "@/lib/broadcastSync"
import { MessageType } from "@prisma/client"
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
    if (!old) return old
    const all = old.pages.flatMap((p) => p.messages)
    const updated = updater(all)
    const pageSize = old.pages[old.pages.length - 1]?.messages.length ?? 50
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
  text: string,
  createdAt: Date
) {
  queryClient.setQueryData(roomsKey, (old: RoomData[] | undefined) => {
    if (!old) return old
    const updated = old.map((r) =>
      r.id === roomId
        ? { ...r, messages: [{ text, createdAt }] }
        : r
    )
    updated.sort((a, b) => {
      const aTime = a.messages[0]?.createdAt?.getTime() ?? 0
      const bTime = b.messages[0]?.createdAt?.getTime() ?? 0
      return bTime - aTime
    })
    return updated
  })
}

function getMessagesFromCache(
  queryClient: ReturnType<typeof useQueryClient>,
  messagesKey: ReturnType<typeof getQueryKey>
): ChatMessage[] {
  const data = queryClient.getQueryData<MessagesPageData>(messagesKey)
  return data?.pages.flatMap((p) => p.messages) ?? []
}

// ── Send message ────────────────────────────────────────────────────────

export function useSendMessage(roomId: string) {
  const queryClient = useQueryClient()
  const messagesKey = getMessagesKey(roomId)
  const roomsKey = getRoomsKey()

  return trpc.message.send.useMutation({
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: messagesKey })
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const now = new Date()
      const tempMessage: ChatMessage = {
        id: tempId,
        text: input.text,
        type: input.type ?? MessageType.TEXT,
        isDone: false,
        isPinned: false,
        isBot: false,
        remindAt: null,
        remindSnoozeAt: null,
        isRemindDone: false,
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
        msgs.map((m) => (m.id === context?.tempId ? realMessage : m))
      )
      updateSidebarPreview(queryClient, roomsKey, roomId, realMessage.text, new Date(realMessage.createdAt))
      broadcastInvalidate(roomsKey)
    },
    onError: (_err, _input, context) => {
      updateMessagesCacheFlatten(queryClient, messagesKey, (msgs) =>
        msgs.filter((m) => m.id !== context?.tempId)
      )
    },
  })
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
        updateSidebarPreview(queryClient, roomsKey, roomId, updated.text, new Date(updated.createdAt))
        broadcastInvalidate(roomsKey)
      }
    },
  })
}

// ── Delete message ──────────────────────────────────────────────────────

export function useDeleteMessage(roomId: string) {
  const queryClient = useQueryClient()
  const messagesKey = getMessagesKey(roomId)
  const roomsKey = getRoomsKey()

  return trpc.message.delete.useMutation({
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: messagesKey })
      const previous = queryClient.getQueryData(messagesKey)
      updateMessagesCacheFlatten(queryClient, messagesKey, (msgs) =>
        msgs.filter((m) => m.id !== variables.id)
      )
      return { previous }
    },
    onSuccess: (_data, variables) => {
      const allMsgs = getMessagesFromCache(queryClient, messagesKey)
      const latest = allMsgs.reduce((a, b) =>
        new Date(a.createdAt) > new Date(b.createdAt) ? a : b
      , allMsgs[0])

      if (!latest || !allMsgs.some((m) => m.id === variables.id)) {
        queryClient.invalidateQueries({ queryKey: roomsKey })
      }
      broadcastInvalidate(messagesKey)
      broadcastInvalidate(roomsKey)
    },
    onError: (_err, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(messagesKey, context.previous)
    },
  })
}

// ── Toggle done ─────────────────────────────────────────────────────────

export function useToggleDone(roomId: string) {
  const queryClient = useQueryClient()
  const messagesKey = getMessagesKey(roomId)

  return trpc.message.toggleDone.useMutation({
    onMutate: async ({ id, isDone }) => {
      await queryClient.cancelQueries({ queryKey: messagesKey })
      const previous = queryClient.getQueryData(messagesKey)
      updateMessagesCache(queryClient, messagesKey, (msgs) =>
        msgs.map((m) => (m.id === id ? { ...m, isDone } : m))
      )
      return { previous }
    },
    onSuccess: (updated) => {
      updateMessagesCache(queryClient, messagesKey, (msgs) =>
        msgs.map((m) => (m.id === updated.id ? { ...m, isDone: updated.isDone } : m))
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

  return trpc.message.markRemindedAndDone.useMutation({
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: messagesKey })
      const previous = queryClient.getQueryData(messagesKey)
      updateMessagesCache(queryClient, messagesKey, (msgs) =>
        msgs.map((m) => (m.id === id ? { ...m, isRemindDone: true, isDone: true } : m))
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

// ── Check reminders (shared, race-safe, GLOBAL — semua room) ───────────
//
// v2: gak lagi di-scope roomId. Dulu poller nempel di RoomWrapper -> cuma
// ngecek reminder room yang lagi kebuka doang, room lain diem aja sampe
// dibuka manual. Sekarang checkReminders backend cek SEMUA room punya user,
// dipanggil dari SATU poller global (lihat ReminderPoller.tsx) yang mounted
// di Providers, independen dari navigasi antar room.
//
// Karena hasilnya bisa nyebar ke banyak room sekaligus, di-group per roomId
// dulu baru di-merge ke cache masing-masing. Pengecekan "udah ada belum"
// tetep dilakuin DI DALAM callback setQueryData (baca cache paling live),
// bukan dari snapshot luar -> tetep race-safe kayak versi sebelumnya.
export function useCheckReminders() {
  const queryClient = useQueryClient()
  const utils = trpc.useUtils()
  const isCheckingRef = useRef(false)

  return useCallback(async (): Promise<ChatMessage[]> => {
    if (isCheckingRef.current) return []
    isCheckingRef.current = true
    try {
      const newBotMessages = await utils.client.message.checkReminders.mutate()
      if (newBotMessages.length === 0) return []

      const byRoom = new Map<string, ChatMessage[]>()
      for (const msg of newBotMessages) {
        const list = byRoom.get(msg.roomId) ?? []
        list.push(msg)
        byRoom.set(msg.roomId, list)
      }

      const actuallyNew: ChatMessage[] = []

      for (const [roomId, roomMessages] of byRoom) {
        const messagesKey = getMessagesKey(roomId)
        let newOnesForRoom: ChatMessage[] = []

        queryClient.setQueryData(messagesKey, (old: MessagesPageData | undefined) => {
          if (!old) {
            // Room ini belum pernah dibuka sesi ini -> gak ada cache buat
            // di-merge. Begitu dibuka nanti, message.list bakal fetch fresh
            // dari server (row-nya udah ada di DB). Tetep dianggap "baru"
            // buat keperluan notifikasi.
            newOnesForRoom = roomMessages
            return old
          }
          const all = old.pages.flatMap((p) => p.messages)
          const existingIds = new Set(all.map((m) => m.id))
          newOnesForRoom = roomMessages.filter((m) => !existingIds.has(m.id))
          if (newOnesForRoom.length === 0) return old

          const updated = [...all, ...newOnesForRoom]
          const pageSize = old.pages[old.pages.length - 1]?.messages.length ?? MESSAGES_LIMIT
          const pages: MessagesPageData["pages"] = []
          for (let i = 0; i < updated.length; i += pageSize) {
            pages.push({ messages: updated.slice(i, i + pageSize), hasMore: true })
          }
          if (pages.length > 0) {
            pages[pages.length - 1].hasMore = old.pages[old.pages.length - 1]?.hasMore ?? false
          }
          return { ...old, pages }
        })

        actuallyNew.push(...newOnesForRoom)
      }

      return actuallyNew
    } catch (err) {
      console.error("[checkReminders] gagal cek reminder:", err)
      return []
    } finally {
      isCheckingRef.current = false
    }
  }, [queryClient, utils])
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
      updateMessagesCache(queryClient, messagesKey, (msgs) =>
        msgs.map((m) =>
          m.id === id
            ? { ...m, checklistItems: m.checklistItems.map((ci) => {
                const updated = items.find((i) => i.text === ci.text)
                return updated ? { ...ci, isDone: updated.isDone } : ci
              }), isDone: allDone }
            : m
        )
      )
      return { previous }
    },
    onSuccess: (updated) => {
      updateMessagesCache(queryClient, messagesKey, (msgs) =>
        msgs.map((m) =>
          m.id === updated.id
            ? { ...m, text: updated.text, isDone: updated.isDone, checklistItems: updated.checklistItems }
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
      const messageIsDone = nextItems.every((item) => item.isDone)

      updateMessagesCache(queryClient, messagesKey, (msgs) =>
        msgs.map((m) =>
          m.id === messageId
            ? { ...m, checklistItems: nextItems, isDone: messageIsDone }
            : m
        )
      )

      toggleItem.mutate(
        { id: itemId, isDone },
        {
          onError: () => {
            updateMessagesCache(queryClient, messagesKey, (msgs) =>
              msgs.map((m) =>
                m.id === messageId
                  ? { ...m, checklistItems: prevItems, isDone: prevItems.every((i) => i.isDone) }
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