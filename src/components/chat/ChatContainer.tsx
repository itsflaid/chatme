"use client"

import { useState, useMemo } from "react"
import { FiChevronUp, FiChevronDown, FiX } from "react-icons/fi"
import ChatMessages from "./ChatMessages"
import ChatHeader from "./ChatHeader"
import ChatInput from "./ChatInput"
import SnoozeModal from "./modals/SnoozeModal"
import type { ChatMessage } from "@/types/chat"
import type useMessages from "@/hooks/useMessages"

type MessageAPI = ReturnType<typeof useMessages>

type Props = {
  room: { id: string; name: string; icon: string; description: string | null }
  userId: string
  messageAPI: MessageAPI
  onMessageSent?: (text: string) => void
}

export default function ChatContainer({ room, userId, messageAPI, onMessageSent }: Props) {
  const {
    messages,
    loading,
    hasMore,
    loadMore,
    patchMessage,
    removeMessage: apiRemoveMessage,
    addMessage,
    replaceMessage,
    mergeMessages,
  } = messageAPI

  const [snoozeBotId, setSnoozeBotId] = useState<string | null>(null)
  const [snoozeSourceId, setSnoozeSourceId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeIndex, setActiveIndex] = useState(0)

  const reminders = useMemo(
    () => messages.filter((m) => !m.isBot && m.remindAt && !m.isRemindDone),
    [messages]
  )
  const pendingCount = useMemo(
    () => messages.filter((m) => !m.isDone && !m.isBot).length,
    [messages]
  )

  const matchedMessages = searchQuery.trim()
    ? messages.filter((m) => !m.isBot && m.text.toLowerCase().includes(searchQuery.toLowerCase()))
    : []

  function handleSearch(query: string) {
    setSearchQuery(query)
    setActiveIndex(0)
  }

  async function handleCheckReminders() {
    const res = await fetch(`/api/rooms/${room.id}/reminders`)
    if (!res.ok) return
    const newBotMessages: ChatMessage[] = await res.json()
    if (newBotMessages.length > 0) {
      mergeMessages(newBotMessages)
    }
  }

  async function handleBotDone(botMessageId: string, sourceMessageId: string) {
    patchMessage(sourceMessageId, { isDone: true, isRemindDone: true })
    patchMessage(botMessageId, { isRemindDone: true })
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
    patchMessage(snoozeSourceId, { remindAt: newRemindAt })
    patchMessage(snoozeBotId, { isRemindDone: true })
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
    patchMessage(messageId, { isRemindDone: true, isDone: true })
    fetch(`/api/messages/${messageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isRemindDone: true, isDone: true }),
    })
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <ChatHeader
        roomId={room.id}
        name={room.name}
        icon={room.icon}
        description={room.description}
        messageCount={messages.filter((m) => !m.isBot).length}
        pendingCount={pendingCount}
        reminders={reminders}
        messages={messages}
        onReminderDone={handleReminderDone}
        searchQuery={searchQuery}
        onSearch={handleSearch}
      />

      {searchQuery.trim() && (
        <div
          className="flex items-center justify-between px-4 py-2 border-b text-xs"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <span style={{ color: "var(--text3)" }}>
            {matchedMessages.length > 0
              ? `${activeIndex + 1} dari ${matchedMessages.length} hasil`
              : "Tidak ada hasil"}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}
              disabled={activeIndex === 0 || matchedMessages.length === 0}
              className="p-1 rounded-lg transition-opacity disabled:opacity-30 hover:bg-[var(--surface2)]"
              style={{ color: "var(--text2)" }}
            >
              <FiChevronUp size={16} />
            </button>
            <button
              onClick={() => setActiveIndex((i) => Math.min(matchedMessages.length - 1, i + 1))}
              disabled={activeIndex === matchedMessages.length - 1 || matchedMessages.length === 0}
              className="p-1 rounded-lg transition-opacity disabled:opacity-30 hover:bg-[var(--surface2)]"
              style={{ color: "var(--text2)" }}
            >
              <FiChevronDown size={16} />
            </button>
            <button
              onClick={() => {
                setSearchQuery("")
                setActiveIndex(0)
              }}
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
        isLoading={loading}
        loadingMore={loading && messages.length > 0}
        hasMore={hasMore}
        onLoadMore={loadMore}
        onBotDone={handleBotDone}
        onBotSnooze={handleBotSnooze}
        onMessageUpdate={patchMessage}
        onMessageRemove={apiRemoveMessage}
        searchQuery={searchQuery}
        activeMatchId={matchedMessages[activeIndex]?.id ?? null}
      />

      <ChatInput
        roomId={room.id}
        userId={userId}
        onMessageAdd={addMessage}
        onMessageReplace={replaceMessage}
        onMessageRemove={apiRemoveMessage}
        onCheckReminders={handleCheckReminders}
        onMessageSent={onMessageSent}
      />

      {snoozeBotId && (
        <SnoozeModal
          onSelect={handleSnoozeSelect}
          onClose={() => {
            setSnoozeBotId(null)
            setSnoozeSourceId(null)
          }}
        />
      )}
    </div>
  )
}