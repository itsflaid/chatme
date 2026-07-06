"use client"

import { useEffect, useRef } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useMessagesQuery, getMessagesKey } from "@/hooks/useMessages"
import { trpc } from "@/lib/trpc"
import ChatContainer from "./ChatContainer"
import type { ChatMessage } from "@/types/chat"

type Props = {
  roomId: string
  room: { id: string; name: string; icon: string; description: string | null }
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

export default function RoomWrapper({ roomId, room }: Props) {
  const queryClient = useQueryClient()
  const { data: messages = [], fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useMessagesQuery(roomId)
  const messagesRef = useRef(messages)

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  const utils = trpc.useUtils()

  useEffect(() => {
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
            showReminderNotifications(newOnes, currentMessages, room.name)
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
  }, [roomId, room.name, queryClient, utils])

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