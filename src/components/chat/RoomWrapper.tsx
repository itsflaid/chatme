"use client"

import { useEffect, useRef } from "react"
import useMessages from "@/hooks/useMessages"
import { updateRoomLastMessage } from "@/hooks/useRooms"
import ChatContainer from "./ChatContainer"
import type { ChatMessage } from "@/types/chat"

type Props = {
  roomId: string
  userId: string
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

export default function RoomWrapper({ roomId, userId, room }: Props) {
  const messageAPI = useMessages(roomId)
  const { messages, mergeMessages } = messageAPI

  const messagesRef = useRef(messages)
  // Simpan mergeMessages di ref supaya interval tidak perlu di-reset
  // setiap kali mergeMessages berubah referensinya
  const mergeMessagesRef = useRef(mergeMessages)

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  useEffect(() => {
    mergeMessagesRef.current = mergeMessages
  }, [mergeMessages])

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null

    async function pollReminders() {
      if (document.hidden) return
      try {
        const res = await fetch(`/api/rooms/${roomId}/reminders`)
        if (!res.ok) return
        const newBotMessages: ChatMessage[] = await res.json()
        if (newBotMessages.length > 0) {
          const currentMessages = messagesRef.current
          const existingIds = new Set(currentMessages.map((m) => m.id))
          const newOnes = newBotMessages.filter((m) => !existingIds.has(m.id))
          if (newOnes.length > 0) {
            showReminderNotifications(newOnes, currentMessages, room.name)
            mergeMessagesRef.current(newOnes)
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
  // Hanya bergantung pada roomId dan room.name — bukan mergeMessages
  // supaya interval tidak di-reset setiap render
  }, [roomId, room.name])

  return (
    <ChatContainer
      room={room}
      userId={userId}
      messageAPI={messageAPI}
      onMessageSent={(text) => updateRoomLastMessage(roomId, text)}
    />
  )
}