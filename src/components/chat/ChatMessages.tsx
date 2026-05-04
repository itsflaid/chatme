"use client"

import { useEffect, useRef } from "react"
import { Message } from "@prisma/client"
import BubbleWrapper from "./bubble/BubbleWrapper"
import BotBubble from "./bubble/BotBubble"

type Props = {
  messages: Message[]
  onBotDone: (botMessageId: string, sourceMessageId: string) => void
  onBotSnooze: (botMessageId: string, sourceMessageId: string) => void
  onMessageUpdate: (id: string, patch: Partial<Message>) => void
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

type GroupedMessages = { dateLabel: string; messages: Message[] }[]

function groupByDate(messages: Message[]): GroupedMessages {
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

export default function ChatMessages({
  messages,
  onBotDone,
  onBotSnooze,
  onMessageUpdate,
  onMessageRemove,
  searchQuery = "",
  activeMatchId = null,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef<HTMLDivElement>(null)

  // scroll ke bawah saat pesan baru — hanya kalau tidak sedang search
  useEffect(() => {
    if (!searchQuery) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages, searchQuery])

  // scroll ke hasil search aktif
  useEffect(() => {
    if (activeMatchId) {
      activeRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
    }
  }, [activeMatchId])

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-[var(--text3)]">
          Belum ada pesan. Mulai ketik sesuatu!
        </p>
      </div>
    )
  }

  const grouped = groupByDate(messages)

  return (
    <div className="flex-1 overflow-y-auto px-10 py-4 flex flex-col gap-2">
      {grouped.map((group) => (
        <div key={group.dateLabel}>
          <div className="flex justify-center my-3">
            <span className="text-[11px] px-3 py-1 rounded-full border text-[var(--text3)] bg-[var(--surface)] border-[var(--border)]">
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