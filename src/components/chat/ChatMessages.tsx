"use client"

import { useEffect, useRef, useMemo } from "react"
import BubbleWrapper from "./bubble/BubbleWrapper"
import BotBubble from "./bubble/BotBubble"
import type { ChatMessage } from "@/types/chat"

type Props = {
  messages: ChatMessage[]
  isLoading?: boolean
  loadingMore?: boolean
  hasMore?: boolean
  onLoadMore?: () => void
  onBotDone: (botMessageId: string, sourceMessageId: string) => void
  onBotSnooze: (botMessageId: string, sourceMessageId: string) => void
  roomId: string
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
      <div className="flex justify-center my-1">
        <div className="w-24 h-5 rounded-full bg-[var(--surface2)] animate-pulse" />
      </div>

      <div className="flex justify-end">
        <div className="flex flex-col items-end gap-1">
          <div className="h-10 w-48 rounded-[18px_18px_4px_18px] bg-[var(--accent)] opacity-20 animate-pulse" />
          <div className="w-12 h-2 rounded-full bg-[var(--surface2)] animate-pulse" />
        </div>
      </div>

      <div className="flex justify-end">
        <div className="flex flex-col items-end gap-1">
          <div className="h-16 w-64 rounded-[18px_18px_4px_18px] bg-[var(--accent)] opacity-20 animate-pulse" />
          <div className="w-12 h-2 rounded-full bg-[var(--surface2)] animate-pulse" />
        </div>
      </div>

      <div className="flex justify-center my-1">
        <div className="w-16 h-5 rounded-full bg-[var(--surface2)] animate-pulse" />
      </div>

      <div className="flex justify-end">
        <div className="flex flex-col items-end gap-1">
          <div className="h-10 w-56 rounded-[18px_18px_4px_18px] bg-[var(--accent)] opacity-20 animate-pulse" />
          <div className="w-12 h-2 rounded-full bg-[var(--surface2)] animate-pulse" />
        </div>
      </div>

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
  hasMore = false,
  onLoadMore,
  onBotDone,
  onBotSnooze,
  roomId,
  searchQuery = "",
  activeMatchId = null,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const isFirstRender = useRef(true)
  const activeRef = useRef<HTMLDivElement>(null)
  const prevMessageCountRef = useRef(messages.length)
  const prevLastIdRef = useRef(messages[messages.length - 1]?.id ?? null)
  const prevScrollRef = useRef<{ scrollHeight: number; scrollTop: number } | null>(null)

  useEffect(() => {
    if (!sentinelRef.current || !hasMore || !onLoadMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          const container = containerRef.current
          if (container) {
            prevScrollRef.current = {
              scrollHeight: container.scrollHeight,
              scrollTop: container.scrollTop,
            }
          }
          onLoadMore()
        }
      },
      { rootMargin: "200px 0px 0px 0px" }
    )

    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [hasMore, onLoadMore, messages.length])

  useEffect(() => {
    if (prevScrollRef.current && containerRef.current) {
      const { scrollHeight: oldHeight, scrollTop: oldTop } = prevScrollRef.current
      const newHeight = containerRef.current.scrollHeight
      containerRef.current.scrollTop = newHeight - (oldHeight - oldTop)
      prevScrollRef.current = null
    }
  }, [messages.length])

  useEffect(() => {
    if (searchQuery) return

    const currentCount = messages.length
    const currentLastId = messages[messages.length - 1]?.id ?? null
    if (currentCount === 0) return
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

    if (isNewMessage) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages, searchQuery])

  useEffect(() => {
    if (activeMatchId) {
      activeRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
    }
  }, [activeMatchId])

  const messageMap = useMemo(() => {
    const map = new Map<string, ChatMessage>()
    messages.forEach((m) => map.set(m.id, m))
    return map
  }, [messages])

  const grouped = useMemo(() => groupByDate(messages), [messages])

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

  return (
    <div
      ref={containerRef}
      className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-10 py-5 flex flex-col gap-2"
    >
      <div ref={sentinelRef} className="h-1 w-full" />

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
                  ? messageMap.get(message.sourceMessageId) ?? null
                  : null
                return (
                  <BotBubble
                    key={message.id}
                    message={message}
                    sourceMessage={sourceMessage}
                    onDone={onBotDone}
                    onSnooze={onBotSnooze}
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
                    roomId={roomId}
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
