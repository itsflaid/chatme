"use client"

import { useState, useMemo, useCallback } from "react"
import { FiChevronUp, FiChevronDown, FiX } from "react-icons/fi"
import ChatMessages from "./ChatMessages"
import ChatHeader from "./ChatHeader"
import ChatInput from "./ChatInput"
import SnoozeModal from "./modals/SnoozeModal"
import { MessageActionsProvider, useMessageActions } from "@/hooks/useMessageActions"
import { useMarkRemindedAndDone, useCheckReminders } from "@/hooks/useMessages"
import type { ChatMessage } from "@/types/chat"

type Props = {
  room: { id: string; name: string; icon: string; description: string | null }
  messages: ChatMessage[]
  loading: boolean
  loadingMore: boolean
  hasMore: boolean
  onLoadMore: () => void
}

function ChatContainerInner({ room, messages, loading, loadingMore, hasMore, onLoadMore }: Props) {
  const roomId = room.id
  const { toggleDone, markReminded, setReminder } = useMessageActions()
  const markRemindedAndDone = useMarkRemindedAndDone(roomId)

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

  const matchedMessages = useMemo(
    () =>
      searchQuery.trim()
        ? messages.filter((m) => !m.isBot && m.text.toLowerCase().includes(searchQuery.toLowerCase()))
        : [],
    [messages, searchQuery]
  )

  function handleSearch(query: string) {
    setSearchQuery(query)
    setActiveIndex(0)
  }

  const checkReminders = useCheckReminders(roomId)

  async function handleCheckReminders() {
    await checkReminders()
  }

  const handleBotDone = useCallback((botMessageId: string, sourceMessageId: string) => {
    toggleDone.mutate({ id: sourceMessageId, isDone: true })
    markReminded.mutate({ id: botMessageId })
  }, [toggleDone, markReminded])

  const handleBotSnooze = useCallback((botMessageId: string, sourceMessageId: string) => {
    setSnoozeBotId(botMessageId)
    setSnoozeSourceId(sourceMessageId)
  }, [])

  async function handleSnoozeSelect(minutes: number) {
    if (!snoozeBotId || !snoozeSourceId) return
    const newRemindAt = new Date(Date.now() + minutes * 60 * 1000)
    setReminder.mutate({ id: snoozeSourceId, remindAt: newRemindAt.toISOString() })
    markReminded.mutate({ id: snoozeBotId })
    setSnoozeBotId(null)
    setSnoozeSourceId(null)
  }

  function handleReminderDone(messageId: string) {
    markRemindedAndDone.mutate({ id: messageId })
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <ChatHeader
        roomId={roomId}
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
        loadingMore={loadingMore}
        hasMore={hasMore}
        onLoadMore={onLoadMore}
        onBotDone={handleBotDone}
        onBotSnooze={handleBotSnooze}
        roomId={roomId}
        searchQuery={searchQuery}
        activeMatchId={matchedMessages[activeIndex]?.id ?? null}
      />

      <ChatInput
        roomId={roomId}
        onCheckReminders={handleCheckReminders}
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

export default function ChatContainer(props: Props) {
  return (
    <MessageActionsProvider roomId={props.room.id}>
      <ChatContainerInner {...props} />
    </MessageActionsProvider>
  )
}