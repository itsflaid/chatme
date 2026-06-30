"use client"

import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { queryKeys } from "@/lib/queryKeys"
import { broadcastInvalidate } from "@/lib/broadcastSync"
import { MessageType } from "@prisma/client"
import type { ChatMessage } from "@/types/chat"
import type { RoomData } from "./useRooms"

// ── Read query ──────────────────────────────────────────────────────────

type MessagesPage = { messages: ChatMessage[]; hasMore: boolean }

async function fetchMessagesPage(roomId: string, cursor?: string): Promise<MessagesPage> {
  const url = cursor
    ? `/api/rooms/${roomId}/messages?before=${cursor}&limit=30`
    : `/api/rooms/${roomId}/messages?limit=50`
  const res = await fetch(url)
  if (!res.ok) throw new Error("Gagal memuat pesan")
  return res.json()
}

export function useMessagesQuery(roomId: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.messages(roomId),
    queryFn: ({ pageParam }) => fetchMessagesPage(roomId, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.messages[0]?.id : undefined,
    select: (data) => {
      const all = data.pages.flatMap((p) => p.messages)
      const unique = new Map(all.map((m) => [m.id, m]))
      return [...unique.values()].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )
    },
  })
}

// ── Mutation helpers ────────────────────────────────────────────────────

type MessagesPageData = {
  pageParams: unknown[]
  pages: MessagesPage[]
}

function updateMessagesCache(
  queryClient: ReturnType<typeof useQueryClient>,
  roomId: string,
  updater: (messages: ChatMessage[]) => ChatMessage[]
) {
  queryClient.setQueryData(queryKeys.messages(roomId), (old: MessagesPageData | undefined) => {
    if (!old) return old
    const all = old.pages.flatMap((p) => p.messages)
    const updated = updater(all)
    const pageSize = old.pages[old.pages.length - 1]?.messages.length ?? 50
    const pages: MessagesPage[] = []
    for (let i = 0; i < updated.length; i += pageSize) {
      pages.push({ messages: updated.slice(i, i + pageSize), hasMore: true })
    }
    if (pages.length > 0) pages[pages.length - 1].hasMore = old.pages[old.pages.length - 1]?.hasMore ?? false
    return { ...old, pages }
  })
}

function updateSidebarPreview(
  queryClient: ReturnType<typeof useQueryClient>,
  roomId: string,
  text: string,
  createdAt: Date
) {
  queryClient.setQueryData(queryKeys.rooms, (old: RoomData[] | undefined) => {
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
  roomId: string
): ChatMessage[] {
  const data = queryClient.getQueryData<MessagesPageData>(queryKeys.messages(roomId))
  return data?.pages.flatMap((p) => p.messages) ?? []
}

// ── Send message ────────────────────────────────────────────────────────

type SendMessageInput = {
  roomId: string
  userId: string
  text: string
  type?: MessageType
  items?: string[]
}

export function useSendMessage(roomId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: ["send-message", roomId],
    mutationFn: async (input: SendMessageInput) => {
      const body: Record<string, unknown> = { roomId: input.roomId, text: input.text }
      if (input.type) body.type = input.type
      if (input.items) body.items = input.items
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error("Gagal mengirim pesan")
      return res.json() as Promise<ChatMessage>
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.messages(roomId) })
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
        userId: input.userId,
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

      updateMessagesCache(queryClient, roomId, (msgs) => [...msgs, tempMessage])
      return { tempId }
    },
    onSuccess: (realMessage, _input, context) => {
      updateMessagesCache(queryClient, roomId, (msgs) =>
        msgs.map((m) => (m.id === context?.tempId ? realMessage : m))
      )
      updateSidebarPreview(queryClient, roomId, realMessage.text, new Date(realMessage.createdAt))
      broadcastInvalidate(queryKeys.rooms)
    },
    onError: (_err, _input, context) => {
      updateMessagesCache(queryClient, roomId, (msgs) =>
        msgs.filter((m) => m.id !== context?.tempId)
      )
    },
  })
}

// ── Edit message ────────────────────────────────────────────────────────

export function useEditMessage(roomId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ messageId, text }: { messageId: string; text: string }) => {
      const res = await fetch(`/api/messages/${messageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      })
      if (!res.ok) throw new Error("Gagal edit pesan")
      return res.json() as Promise<ChatMessage>
    },
    onSuccess: (updated) => {
      updateMessagesCache(queryClient, roomId, (msgs) =>
        msgs.map((m) =>
          m.id === updated.id ? { ...m, text: updated.text, editedAt: updated.editedAt } : m
        )
      )

      const allMsgs = getMessagesFromCache(queryClient, roomId)
      const latest = allMsgs.reduce((a, b) =>
        new Date(a.createdAt) > new Date(b.createdAt) ? a : b
      , allMsgs[0])

      if (latest?.id === updated.id) {
        updateSidebarPreview(queryClient, roomId, updated.text, new Date(updated.createdAt))
        broadcastInvalidate(queryKeys.rooms)
      }
    },
  })
}

// ── Delete message ──────────────────────────────────────────────────────

export function useDeleteMessage(roomId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (messageId: string) => {
      const res = await fetch(`/api/messages/${messageId}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Gagal hapus pesan")
    },
    onSuccess: (_data, messageId) => {
      updateMessagesCache(queryClient, roomId, (msgs) =>
        msgs.filter((m) => m.id !== messageId)
      )

      const allMsgs = getMessagesFromCache(queryClient, roomId)
      const latest = allMsgs.reduce((a, b) =>
        new Date(a.createdAt) > new Date(b.createdAt) ? a : b
      , allMsgs[0])

      if (!latest || !allMsgs.some((m) => m.id === messageId)) {
        queryClient.invalidateQueries({ queryKey: queryKeys.rooms })
      }
    },
  })
}

// ── Toggle done ─────────────────────────────────────────────────────────

export function useToggleDone(roomId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ messageId, isDone }: { messageId: string; isDone: boolean }) => {
      const res = await fetch(`/api/messages/${messageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDone }),
      })
      if (!res.ok) throw new Error("Gagal update status")
      return res.json() as Promise<ChatMessage>
    },
    onMutate: async ({ messageId, isDone }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.messages(roomId) })
      updateMessagesCache(queryClient, roomId, (msgs) =>
        msgs.map((m) => (m.id === messageId ? { ...m, isDone } : m))
      )
    },
    onSuccess: (updated) => {
      updateMessagesCache(queryClient, roomId, (msgs) =>
        msgs.map((m) => (m.id === updated.id ? updated : m))
      )
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.messages(roomId) })
    },
  })
}

// ── Toggle pin ──────────────────────────────────────────────────────────

export function useTogglePin(roomId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ messageId, isPinned }: { messageId: string; isPinned: boolean }) => {
      const res = await fetch(`/api/messages/${messageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPinned }),
      })
      if (!res.ok) throw new Error("Gagal update pin")
    },
    onMutate: async ({ messageId, isPinned }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.messages(roomId) })
      updateMessagesCache(queryClient, roomId, (msgs) =>
        msgs.map((m) => (m.id === messageId ? { ...m, isPinned } : m))
      )
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.messages(roomId) })
    },
  })
}

// ── Set reminder ────────────────────────────────────────────────────────

export function useSetReminder(roomId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ messageId, remindAt }: { messageId: string; remindAt: string }) => {
      const res = await fetch(`/api/messages/${messageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ remindAt, isRemindDone: false }),
      })
      if (!res.ok) throw new Error("Gagal set reminder")
    },
    onMutate: async ({ messageId, remindAt }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.messages(roomId) })
      updateMessagesCache(queryClient, roomId, (msgs) =>
        msgs.map((m) =>
          m.id === messageId ? { ...m, remindAt: new Date(remindAt), isRemindDone: false } : m
        )
      )
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.messages(roomId) })
    },
  })
}

// ── Mark reminded ───────────────────────────────────────────────────────

export function useMarkReminded(roomId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ messageId }: { messageId: string }) => {
      const res = await fetch(`/api/messages/${messageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRemindDone: true }),
      })
      if (!res.ok) throw new Error("Gagal update reminder")
    },
    onMutate: async ({ messageId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.messages(roomId) })
      updateMessagesCache(queryClient, roomId, (msgs) =>
        msgs.map((m) => (m.id === messageId ? { ...m, isRemindDone: true } : m))
      )
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.messages(roomId) })
    },
  })
}

// ── Checklist toggle item ───────────────────────────────────────────────

export function useChecklistToggle(roomId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      messageId,
      title,
      items,
    }: {
      messageId: string
      title: string
      items: { text: string; isDone: boolean }[]
    }) => {
      const res = await fetch(`/api/messages/${messageId}/checklist`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, items }),
      })
      if (!res.ok) throw new Error("Gagal update checklist")
      return res.json() as Promise<ChatMessage>
    },
    onMutate: async ({ messageId, items }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.messages(roomId) })
      const allDone = items.every((i) => i.isDone)
      updateMessagesCache(queryClient, roomId, (msgs) =>
        msgs.map((m) =>
          m.id === messageId
            ? { ...m, checklistItems: m.checklistItems.map((ci) => {
                const updated = items.find((i) => i.text === ci.text)
                return updated ? { ...ci, isDone: updated.isDone } : ci
              }), isDone: allDone }
            : m
        )
      )
    },
    onSuccess: (updated) => {
      updateMessagesCache(queryClient, roomId, (msgs) =>
        msgs.map((m) => (m.id === updated.id ? updated : m))
      )
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.messages(roomId) })
    },
  })
}
