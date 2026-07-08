"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { useMessagesQuery, getMessagesKey } from "@/hooks/useMessages"
import { useRoom } from "@/hooks/useRoom"
import { trpc } from "@/lib/trpc"
import ChatContainer from "./ChatContainer"
import type { ChatMessage } from "@/types/chat"

type Props = {
  roomId: string
}

function showReminderNotifications(
  botMessages: ChatMessage[],
  messages: ChatMessage[],
  roomName: string
) {
  if (!("Notification" in window) || Notification.permission !== "granted") return
  for (const botMessage of botMessages) {
    const sourceMessage = messages.find((m) => m.id === botMessage.sourceMessageId)
    const notification = new Notification(`Pengingat dari ${roomName}`, {
      body: sourceMessage?.text || "Ada pengingat yang perlu kamu cek.",
      icon: "/favicon.ico",
      tag: `chatme-reminder-${botMessage.sourceMessageId ?? botMessage.id}`,
    })
    notification.onclick = () => {
      window.focus()
      notification.close()
    }
  }
}

export default function RoomWrapper({ roomId }: Props) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: room, error: roomError } = useRoom(roomId)
  const { data: messages = [], fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useMessagesQuery(roomId)
  const messagesRef = useRef(messages)

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  useEffect(() => {
    if (roomError) router.replace("/")
  }, [roomError, router])

  const utils = trpc.useUtils()

  useEffect(() => {
    if (!room) return
    let interval: ReturnType<typeof setInterval> | null = null

    async function pollReminders() {
      if (document.hidden) return
      try {
        const newBotMessages = await utils.message.checkReminders.fetch({ roomId })
        if (newBotMessages.length > 0) {
          const currentMessages = messagesRef.current
          const existingIds = new Set(currentMessages.map((m) => m.id))
          const newOnes = newBotMessages.filter((m) => !existingIds.has(m.id))
          if (newOnes.length > 0) {
            showReminderNotifications(newOnes, currentMessages, room!.name)
            const messagesKey = getMessagesKey(roomId)
            type MessagesPageData = {
              pageParams: unknown[]
              pages: { messages: ChatMessage[]; hasMore: boolean }[]
            }
            queryClient.setQueryData(messagesKey, (old: MessagesPageData | undefined) => {
              if (!old) return old
              const pages = [...old.pages]
              const lastIndex = pages.length - 1
              pages[lastIndex] = {
                ...pages[lastIndex],
                messages: [...pages[lastIndex].messages, ...newOnes],
              }
              return { ...old, pages }
            })
          }
        }
      } catch {
        /* silent */
      }
    }

    interval = setInterval(pollReminders, 5000)
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [roomId, room, queryClient, utils])

  if (!room && !roomError) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-[var(--surface)] border-[var(--border)]">
        <div className="w-8 h-8 rounded-lg bg-[var(--surface2)] animate-pulse" />
        <div className="w-10 h-10 rounded-full bg-[var(--surface2)] animate-pulse" />
        <div className="flex flex-col gap-2 flex-1">
          <div className="w-28 h-3 rounded-full bg-[var(--surface2)] animate-pulse" />
          <div className="w-20 h-2 rounded-full bg-[var(--surface2)] animate-pulse" />
        </div>
      </div>
    )
  }

  if (roomError || !room) return null

  return (
    <ChatContainer
      room={room}
      messages={messages}
      loading={isLoading}
      loadingMore={isFetchingNextPage}
      hasMore={hasNextPage ?? false}
      onLoadMore={() => fetchNextPage()}
    />
  )
}
