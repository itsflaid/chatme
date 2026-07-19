"use client"

import { useEffect, useRef } from "react"
import { useCheckReminders } from "@/hooks/useMessages"
import useRooms from "@/hooks/useRooms"
import type { ChatMessage } from "@/types/chat"

type BotMessageWithSource = ChatMessage & {
  sourceMessage?: { text: string } | null
}

function showReminderNotifications(botMessages: BotMessageWithSource[], roomName: (roomId: string) => string) {
  if (typeof window === "undefined") return
  if (!("Notification" in window) || Notification.permission !== "granted") return

  for (const botMessage of botMessages) {
    const notification = new Notification(`Pengingat dari ${roomName(botMessage.roomId)}`, {
      body: botMessage.sourceMessage?.text || "Ada pengingat yang perlu kamu cek.",
      icon: "/favicon.ico",
      tag: `chatme-reminder-${botMessage.sourceMessageId ?? botMessage.id}`,
    })
    notification.onclick = () => {
      window.focus()
      notification.close()
    }
  }
}

export default function ReminderPoller() {
  const { rooms, loading, error } = useRooms()
  const checkReminders = useCheckReminders()
  const roomsRef = useRef(rooms)

  useEffect(() => {
    roomsRef.current = rooms
  }, [rooms])

  function getRoomName(roomId: string) {
    return roomsRef.current.find((r) => r.id === roomId)?.name ?? "ChatMe"
  }

  useEffect(() => {
    if (loading || error) return

    let interval: ReturnType<typeof setInterval> | null = null

    async function poll() {
      if (document.hidden) return
      const actuallyNew = await checkReminders()
      if (actuallyNew.length > 0) {
        showReminderNotifications(actuallyNew as BotMessageWithSource[], getRoomName)
      }
    }

    function handleVisibilityChange() {
      if (!document.hidden) poll()
    }

    poll()
    interval = setInterval(poll, 5000)
    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      if (interval) clearInterval(interval)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [loading, error, checkReminders])

  return null
}
