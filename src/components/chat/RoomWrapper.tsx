"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useMessagesQuery, useCheckReminders } from "@/hooks/useMessages"
import { useRoom } from "@/hooks/useRoom"
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
  const { data: room, error: roomError } = useRoom(roomId)
  const { data: messages = [], fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useMessagesQuery(roomId)
  const messagesRef = useRef(messages)
  const checkReminders = useCheckReminders(roomId)

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  useEffect(() => {
    if (roomError) router.replace("/")
  }, [roomError, router])

  useEffect(() => {
    if (!room) return
    let interval: ReturnType<typeof setInterval> | null = null

    async function pollReminders() {
      if (document.hidden) return
      const actuallyNew = await checkReminders()
      if (actuallyNew.length > 0) {
        showReminderNotifications(actuallyNew, messagesRef.current, room!.name)
      }
    }

    interval = setInterval(pollReminders, 5000)
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [room, checkReminders])

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