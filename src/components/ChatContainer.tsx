"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Message } from "@prisma/client"
import ChatMessages from "./ChatMessages"
import ChatHeader from "./ChatHeader"
import SnoozeModal from "./SnoozeModal"

type Props = {
  messages: Message[]
  room: { name: string; icon: string }
}

export default function ChatContainer({ messages, room }: Props) {
  const [snoozeBotId, setSnoozeBotId] = useState<string | null>(null)
  const [snoozeSourceId, setSnoozeSourceId] = useState<string | null>(null)
  const router = useRouter()

  const reminders = messages.filter(m => !m.isBot && m.remindAt && !m.isRemindDone)
  const pendingCount = messages.filter(m => !m.isDone && !m.isBot).length

  async function handleBotDone(botMessageId: string, sourceMessageId: string) {
    await fetch(`/api/messages/${sourceMessageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDone: true, isRemindDone: true }),
    })
    await fetch(`/api/messages/${botMessageId}`, { method: "DELETE" })
    router.refresh()
  }

  function handleBotSnooze(botMessageId: string, sourceMessageId: string) {
    setSnoozeBotId(botMessageId)
    setSnoozeSourceId(sourceMessageId)
  }

  async function handleSnoozeSelect(minutes: number) {
    if (!snoozeBotId || !snoozeSourceId) return
    const newRemindAt = new Date(Date.now() + minutes * 60 * 1000)
    await fetch(`/api/messages/${snoozeSourceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ remindAt: newRemindAt.toISOString() }),
    })
    await fetch(`/api/messages/${snoozeBotId}`, { method: "DELETE" })
    setSnoozeBotId(null)
    setSnoozeSourceId(null)
    router.refresh()
  }

  async function handleReminderDone(messageId: string) {
    await fetch(`/api/messages/${messageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isRemindDone: true, isDone: true }),
    })
    router.refresh()
  }

  return (
    <>
      <ChatHeader
        name={room.name}
        icon={room.icon}
        messageCount={messages.filter(m => !m.isBot).length}
        pendingCount={pendingCount}
        reminders={reminders}
        onReminderDone={handleReminderDone}
      />
      <ChatMessages
        messages={messages}
        onBotDone={handleBotDone}
        onBotSnooze={handleBotSnooze}
      />
      {snoozeBotId && (
        <SnoozeModal
          onSelect={handleSnoozeSelect}
          onClose={() => { setSnoozeBotId(null); setSnoozeSourceId(null) }}
        />
      )}
    </>
  )
}