"use client"

import { useEffect, useRef } from "react"
import BubbleWrapper from "./bubble/BubbleWrapper"
import BotBubble from "./bubble/BotBubble"
import type { ChatMessage } from "@/types/chat"

type Props = {
  messages: ChatMessage[]
  isLoading?: boolean
  onBotDone: (botMessageId: string, sourceMessageId: string) => void
  onBotSnooze: (botMessageId: string, sourceMessageId: string) => void
  onMessageUpdate: (id: string, patch: Partial<ChatMessage>) => void
  onMessageRemove: (id: string) => void
  searchQuery?: string
  activeMatchId?: string | null
}

function getDateLabel(date: Date): string {
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (date.toDateString() === today.toDateString()) return "Hari ini"
  if (date.toDateString() === yesterday.toDateString()) return "Kemarin"
  return date.toLocaleDateString("id-ID", {
    day: "numeric", month: "long", year: "numeric"
  })
}

type GroupedMessages = { dateLabel: string; messages: ChatMessage[] }[]

function groupByDate(messages: ChatMessage[]): GroupedMessages {
  return messages.reduce<GroupedMessages>((groups, message) => {
    const dateLabel = getDateLabel(new Date(message.createdAt))
    const lastGroup = groups[groups.length - 1]
    if (lastGroup && lastGroup.dateLabel === dateLabel) {
      lastGroup.messages.push(message)
    } else {
      groups.push({ dateLabel, messages: [message] })
    }
    return groups
  }, [])
}

function MessagesSkeleton() {
  return (
    <div className="flex-1 min-h-0 overflow-hidden px-3 sm:px-10 py-5 flex flex-col gap-3">
      {/* date label skeleton */}
      <div className="flex justify-center my-1">
        <div className="w-24 h-5 rounded-full bg-[var(--surface2)] animate-pulse" />
      </div>

      {/* bubble kanan */}
      <div className="flex justify-end">
        <div className="flex flex-col items-end gap-1">
          <div className="h-10 w-48 rounded-[18px_18px_4px_18px] bg-[var(--accent)] opacity-20 animate-pulse" />
          <div className="w-12 h-2 rounded-full bg-[var(--surface2)] animate-pulse" />
        </div>
      </div>

      {/* bubble kanan lebih panjang */}
      <div className="flex justify-end">
        <div className="flex flex-col items-end gap-1">
          <div className="h-16 w-64 rounded-[18px_18px_4px_18px] bg-[var(--accent)] opacity-20 animate-pulse" />
          <div className="w-12 h-2 rounded-full bg-[var(--surface2)] animate-pulse" />
        </div>
      </div>

      {/* date label skeleton kedua */}
      <div className="flex justify-center my-1">
        <div className="w-16 h-5 rounded-full bg-[var(--surface2)] animate-pulse" />
      </div>

      {/* bubble kanan */}
      <div className="flex justify-end">
        <div className="flex flex-col items-end gap-1">
          <div className="h-10 w-56 rounded-[18px_18px_4px_18px] bg-[var(--accent)] opacity-20 animate-pulse" />
          <div className="w-12 h-2 rounded-full bg-[var(--surface2)] animate-pulse" />
        </div>
      </div>

      {/* bubble kanan pendek */}
      <div className="flex justify-end">
        <div className="flex flex-col items-end gap-1">
          <div className="h-10 w-36 rounded-[18px_18px_4px_18px] bg-[var(--accent)] opacity-20 animate-pulse" />
          <div className="w-12 h-2 rounded-full bg-[var(--surface2)] animate-pulse" />
        </div>
      </div>
    </div>
  )
}

export default function ChatMessages({
  messages,
  isLoading = false,
  onBotDone,
  onBotSnooze,
  onMessageUpdate,
  onMessageRemove,
  searchQuery = "",
  activeMatchId = null,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const isFirstRender = useRef(true)
  const activeRef = useRef<HTMLDivElement>(null)
  const prevMessageCountRef = useRef(messages.length)
  const prevLastIdRef = useRef(messages[messages.length - 1]?.id ?? null)

  // scroll ke bawah: instant di render pertama, smooth hanya ketika ada pesan BARU
  // (bukan saat toggle checklist / edit yang cuma mutasi messages yang sudah ada)
  useEffect(() => {
    if (searchQuery) return

    const currentCount = messages.length
    const currentLastId = messages[messages.length - 1]?.id ?? null
    const isNewMessage =
      currentCount > prevMessageCountRef.current ||
      currentLastId !== prevLastIdRef.current

    if (isFirstRender.current) {
      isFirstRender.current = false
      prevMessageCountRef.current = currentCount
      prevLastIdRef.current = currentLastId
      bottomRef.current?.scrollIntoView({ behavior: "instant" })
      return
    }

    prevMessageCountRef.current = currentCount
    prevLastIdRef.current = currentLastId

    // hanya scroll kalau memang ada pesan baru
    if (isNewMessage) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages, searchQuery])

  // scroll ke hasil search aktif
  useEffect(() => {
    if (activeMatchId) {
      activeRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
    }
  }, [activeMatchId])

  if (isLoading && messages.length === 0) {
    return <MessagesSkeleton />
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-[var(--text3)]">
          Belum ada catatan. Mulai dari mana saja.
        </p>
      </div>
    )
  }

  const grouped = groupByDate(messages)

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-10 py-5 flex flex-col gap-2">
      {grouped.map((group) => (
        <div key={group.dateLabel}>
          <div className="flex justify-center my-3">
            <span className="neo-card rotate-1 rounded-lg bg-[var(--surface)] px-3 py-1 text-[11px] font-semibold text-[var(--text3)]">
              {group.dateLabel}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {group.messages.map((message) => {
              const isTemp = message.id.startsWith("temp-")
              const isActiveMatch = message.id === activeMatchId
              const isMatch = searchQuery.trim() &&
                !message.isBot &&
                message.text.toLowerCase().includes(searchQuery.toLowerCase())

              if (message.isBot) {
                const sourceMessage = message.sourceMessageId
                  ? messages.find(m => m.id === message.sourceMessageId) ?? null
                  : null
                return (
                  <BotBubble
                    key={message.id}
                    message={message}
                    sourceMessage={sourceMessage}
                    onDone={() => onBotDone(message.id, message.sourceMessageId!)}
                    onSnooze={() => onBotSnooze(message.id, message.sourceMessageId!)}
                    isNew={isTemp}
                  />
                )
              }

              return (
                <div
                  key={message.id}
                  ref={isActiveMatch ? activeRef : null}
                  className="rounded-2xl transition-all duration-300"
                  style={{
                    outline: isActiveMatch
                      ? "2px solid var(--accent)"
                      : "none",
                    opacity: searchQuery.trim() && !isMatch ? 0.35 : 1,
                  }}
                >
                  <BubbleWrapper
                    message={message}
                    onUpdate={onMessageUpdate}
                    onRemove={onMessageRemove}
                    isNew={isTemp}
                    searchQuery={searchQuery}
                  />
                </div>
              )
            })}
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  )
}