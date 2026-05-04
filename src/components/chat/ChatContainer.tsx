"use client"

import { useState } from "react"
import { Message } from "@prisma/client"
import { FiChevronUp, FiChevronDown, FiX } from "react-icons/fi"
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
  const [searchQuery, setSearchQuery] = useState("")
  const [activeIndex, setActiveIndex] = useState(0)

  const reminders = messages.filter(m => !m.isBot && m.remindAt && !m.isRemindDone)
  const pendingCount = messages.filter(m => !m.isDone && !m.isBot).length

  const matchedMessages = searchQuery.trim()
    ? messages.filter(m =>
        !m.isBot &&
        m.text.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : []

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

  function handleSearch(query: string) {
    setSearchQuery(query)
    setActiveIndex(0)
  }

  async function handleBotDone(botMessageId: string, sourceMessageId: string) {
    // update local state — TIDAK hapus bot message, cuma tandai done
    updateMessage(sourceMessageId, { isDone: true, isRemindDone: true })
    updateMessage(botMessageId, { isRemindDone: true })

    // sync background
    fetch(`/api/messages/${sourceMessageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDone: true, isRemindDone: true }),
    })
    fetch(`/api/messages/${botMessageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isRemindDone: true }),
    })
  }

  function handleBotSnooze(botMessageId: string, sourceMessageId: string) {
    setSnoozeBotId(botMessageId)
    setSnoozeSourceId(sourceMessageId)
  }

  async function handleSnoozeSelect(minutes: number) {
    if (!snoozeBotId || !snoozeSourceId) return
    const newRemindAt = new Date(Date.now() + minutes * 60 * 1000)

    // update local state — TIDAK hapus bot message
    updateMessage(snoozeSourceId, { remindAt: newRemindAt })
    updateMessage(snoozeBotId, { isRemindDone: true })

    // sync background
    fetch(`/api/messages/${snoozeSourceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ remindAt: newRemindAt.toISOString() }),
    })
    fetch(`/api/messages/${snoozeBotId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isRemindDone: true }),
    })

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
        searchQuery={searchQuery}
        onSearch={handleSearch}
      />

      {/* search result bar */}
      {searchQuery.trim() && (
        <div
          className="flex items-center justify-between px-4 py-2 border-b text-xs"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <span style={{ color: "var(--text3)" }}>
            {matchedMessages.length > 0
              ? `${activeIndex + 1} dari ${matchedMessages.length} hasil`
              : "Tidak ada hasil"
            }
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveIndex(i => Math.max(0, i - 1))}
              disabled={activeIndex === 0 || matchedMessages.length === 0}
              className="p-1 rounded-lg transition-opacity disabled:opacity-30 hover:bg-[var(--surface2)]"
              style={{ color: "var(--text2)" }}
            >
              <FiChevronUp size={16} />
            </button>
            <button
              onClick={() => setActiveIndex(i => Math.min(matchedMessages.length - 1, i + 1))}
              disabled={activeIndex === matchedMessages.length - 1 || matchedMessages.length === 0}
              className="p-1 rounded-lg transition-opacity disabled:opacity-30 hover:bg-[var(--surface2)]"
              style={{ color: "var(--text2)" }}
            >
              <FiChevronDown size={16} />
            </button>
            <button
              onClick={() => { setSearchQuery(""); setActiveIndex(0) }}
              className="p-1 rounded-lg hover:bg-[var(--surface2)] ml-1"
              style={{ color: "var(--text3)" }}
            >
              <FiX size={14} />
            </button>
          </div>
        </div>
      )}

      <ChatMessages
        messages={messages}
        onBotDone={handleBotDone}
        onBotSnooze={handleBotSnooze}
        onMessageUpdate={updateMessage}
        onMessageRemove={removeMessage}
        searchQuery={searchQuery}
        activeMatchId={matchedMessages[activeIndex]?.id ?? null}
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