"use client"

import { useQueryClient } from "@tanstack/react-query"
import { trpc } from "@/lib/trpc"
import { getQueryKey } from "@trpc/react-query"
import { broadcastInvalidate } from "@/lib/broadcastSync"
import { MessageType } from "@prisma/client"
import type { ChatMessage } from "@/types/chat"
import type { RoomData } from "./useRooms"

// ── Read query ──────────────────────────────────────────────────────────

export function useMessagesQuery(roomId: string) {
  return trpc.message.list.useInfiniteQuery(
    { roomId, limit: 50 },
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

function updateMessagesCache(
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
  const messagesKey = getQueryKey(trpc.message.list, { roomId }, "infinite")
  const roomsKey = getQueryKey(trpc.room.list)

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

      updateMessagesCache(queryClient, messagesKey, (msgs) => [...msgs, tempMessage])
      return { tempId }
    },
    onSuccess: (realMessage, _input, context) => {
      updateMessagesCache(queryClient, messagesKey, (msgs) =>
        msgs.map((m) => (m.id === context?.tempId ? realMessage : m))
      )
      updateSidebarPreview(queryClient, roomsKey, roomId, realMessage.text, new Date(realMessage.createdAt))
      broadcastInvalidate(roomsKey)
    },
    onError: (_err, _input, context) => {
      updateMessagesCache(queryClient, messagesKey, (msgs) =>
        msgs.filter((m) => m.id !== context?.tempId)
      )
    },
  })
}

// ── Edit message ────────────────────────────────────────────────────────

export function useEditMessage(roomId: string) {
  const queryClient = useQueryClient()
  const messagesKey = getQueryKey(trpc.message.list, { roomId }, "infinite")
  const roomsKey = getQueryKey(trpc.room.list)

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
  const messagesKey = getQueryKey(trpc.message.list, { roomId }, "infinite")
  const roomsKey = getQueryKey(trpc.room.list)

  return trpc.message.delete.useMutation({
    onSuccess: (_data, variables) => {
      const messageId = variables.id
      updateMessagesCache(queryClient, messagesKey, (msgs) =>
        msgs.filter((m) => m.id !== messageId)
      )

      const allMsgs = getMessagesFromCache(queryClient, messagesKey)
      const latest = allMsgs.reduce((a, b) =>
        new Date(a.createdAt) > new Date(b.createdAt) ? a : b
      , allMsgs[0])

      if (!latest || !allMsgs.some((m) => m.id === messageId)) {
        queryClient.invalidateQueries({ queryKey: roomsKey })
      }
    },
  })
}

// ── Toggle done ─────────────────────────────────────────────────────────

export function useToggleDone(roomId: string) {
  const queryClient = useQueryClient()
  const messagesKey = getQueryKey(trpc.message.list, { roomId }, "infinite")

  return trpc.message.update.useMutation({
    onMutate: async ({ id, isDone }) => {
      await queryClient.cancelQueries({ queryKey: messagesKey })
      updateMessagesCache(queryClient, messagesKey, (msgs) =>
        msgs.map((m) => (m.id === id ? { ...m, isDone: isDone ?? m.isDone } : m))
      )
    },
    onSuccess: (updated) => {
      updateMessagesCache(queryClient, messagesKey, (msgs) =>
        msgs.map((m) => (m.id === updated.id ? { ...updated, checklistItems: m.checklistItems } : m))
      )
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: messagesKey })
    },
  })
}

// ── Toggle pin ──────────────────────────────────────────────────────────

export function useTogglePin(roomId: string) {
  const queryClient = useQueryClient()
  const messagesKey = getQueryKey(trpc.message.list, { roomId }, "infinite")

  return trpc.message.update.useMutation({
    onMutate: async ({ id, isPinned }) => {
      await queryClient.cancelQueries({ queryKey: messagesKey })
      updateMessagesCache(queryClient, messagesKey, (msgs) =>
        msgs.map((m) => (m.id === id ? { ...m, isPinned: isPinned ?? m.isPinned } : m))
      )
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: messagesKey })
    },
  })
}

// ── Set reminder ────────────────────────────────────────────────────────

export function useSetReminder(roomId: string) {
  const queryClient = useQueryClient()
  const messagesKey = getQueryKey(trpc.message.list, { roomId }, "infinite")

  return trpc.message.update.useMutation({
    onMutate: async ({ id, remindAt }) => {
      await queryClient.cancelQueries({ queryKey: messagesKey })
      updateMessagesCache(queryClient, messagesKey, (msgs) =>
        msgs.map((m) =>
          m.id === id ? { ...m, remindAt: new Date(remindAt!), isRemindDone: false } : m
        )
      )
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: messagesKey })
    },
  })
}

// ── Mark reminded ───────────────────────────────────────────────────────

export function useMarkReminded(roomId: string) {
  const queryClient = useQueryClient()
  const messagesKey = getQueryKey(trpc.message.list, { roomId }, "infinite")

  return trpc.message.update.useMutation({
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: messagesKey })
      updateMessagesCache(queryClient, messagesKey, (msgs) =>
        msgs.map((m) => (m.id === id ? { ...m, isRemindDone: true } : m))
      )
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: messagesKey })
    },
  })
}

// ── Checklist toggle item ───────────────────────────────────────────────

export function useChecklistToggle(roomId: string) {
  const queryClient = useQueryClient()
  const messagesKey = getQueryKey(trpc.message.list, { roomId }, "infinite")

  return trpc.message.updateChecklist.useMutation({
    onMutate: async ({ id, items }) => {
      await queryClient.cancelQueries({ queryKey: messagesKey })
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
    },
    onSuccess: (updated) => {
      updateMessagesCache(queryClient, messagesKey, (msgs) =>
        msgs.map((m) => (m.id === updated.id ? updated : m))
      )
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: messagesKey })
    },
  })
}
