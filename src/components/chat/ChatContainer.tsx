"use client"

import { useState } from "react"
import { Message } from "@prisma/client"
import ChatMessages from "./ChatMessages"
import ChatHeader from "./ChatHeader"
import ChatInput from "./ChatInput"
import SnoozeModal from "./modals/SnoozeModal"

type Props = {
  messages: Message[]
  room: { id: string; name: string; icon: string; description: string | null }
  userId: string
}

export default function ChatContainer({ messages: initialMessages, room, userId }: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [snoozeBotId, setSnoozeBotId] = useState<string | null>(null)
  const [snoozeSourceId, setSnoozeSourceId] = useState<string | null>(null)

  const reminders = messages.filter(m => !m.isBot && m.remindAt && !m.isRemindDone)
  const pendingCount = messages.filter(m => !m.isDone && !m.isBot).length

  function updateMessage(id: string, patch: Partial<Message>) {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, ...patch } : m))
  }

  function removeMessage(id: string) {
    setMessages(prev => prev.filter(m => m.id !== id))
  }

  function addMessage(message: Message) {
    setMessages(prev => [...prev, message])
  }

  function replaceMessage(tempId: string, realMessage: Message) {
    setMessages(prev => prev.map(m => m.id === tempId ? realMessage : m))
  }

  async function handleBotDone(botMessageId: string, sourceMessageId: string) {
    updateMessage(sourceMessageId, { isDone: true, isRemindDone: true })
    removeMessage(botMessageId)
    fetch(`/api/messages/${sourceMessageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDone: true, isRemindDone: true }),
    })
    fetch(`/api/messages/${botMessageId}`, { method: "DELETE" })
  }

  function handleBotSnooze(botMessageId: string, sourceMessageId: string) {
    setSnoozeBotId(botMessageId)
    setSnoozeSourceId(sourceMessageId)
  }

  async function handleSnoozeSelect(minutes: number) {
    if (!snoozeBotId || !snoozeSourceId) return
    const newRemindAt = new Date(Date.now() + minutes * 60 * 1000)
    updateMessage(snoozeSourceId, { remindAt: newRemindAt })
    removeMessage(snoozeBotId)
    fetch(`/api/messages/${snoozeSourceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ remindAt: newRemindAt.toISOString() }),
    })
    fetch(`/api/messages/${snoozeBotId}`, { method: "DELETE" })
    setSnoozeBotId(null)
    setSnoozeSourceId(null)
  }

  async function handleReminderDone(messageId: string) {
    updateMessage(messageId, { isRemindDone: true, isDone: true })
    fetch(`/api/messages/${messageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isRemindDone: true, isDone: true }),
    })
  }

  return (
    <>
      <ChatHeader
        roomId={room.id}
        name={room.name}
        icon={room.icon}
        description={room.description}
        messageCount={messages.filter(m => !m.isBot).length}
        pendingCount={pendingCount}
        reminders={reminders}
        messages={messages}
        onReminderDone={handleReminderDone}
      />
      <ChatMessages
        messages={messages}
        onBotDone={handleBotDone}
        onBotSnooze={handleBotSnooze}
        onMessageUpdate={updateMessage}
        onMessageRemove={removeMessage}
      />
      <ChatInput
        roomId={room.id}
        userId={userId}
        onMessageAdd={addMessage}
        onMessageReplace={replaceMessage}
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