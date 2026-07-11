"use client"

import { useEffect, useRef, useMemo, useState, useCallback } from "react"
import { FiArrowDown } from "react-icons/fi"
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

const SCROLL_THRESHOLD = 400

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
  loadingMore = false,
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
  const pendingTempIds = useRef(new Set<string>())
  const [isNearBottom, setIsNearBottom] = useState(true)

  const updateIsNearBottom = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight
    setIsNearBottom(dist < SCROLL_THRESHOLD)
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    updateIsNearBottom()
    const onScroll = () => updateIsNearBottom()
    el.addEventListener("scroll", onScroll, { passive: true })
    return () => el.removeEventListener("scroll", onScroll)
  }, [messages, updateIsNearBottom])

  function scrollToBottom(smooth = true) {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "instant" })
  }

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

    const prevCount = prevMessageCountRef.current
    const prevLastId = prevLastIdRef.current
    const countIncreased = currentCount > prevCount
    const lastIdChanged = currentLastId !== prevLastId

    prevMessageCountRef.current = currentCount
    prevLastIdRef.current = currentLastId

    if (isFirstRender.current) {
      isFirstRender.current = false
      scrollToBottom(false)
      return
    }

    const isTempReconciliation = lastIdChanged && prevLastId?.startsWith("temp-") && pendingTempIds.current.has(prevLastId)
    if (isTempReconciliation) {
      pendingTempIds.current.delete(prevLastId!)
      pendingTempIds.current.add(currentLastId!)
      return
    }

    const isJustNewTemp = lastIdChanged && currentLastId?.startsWith("temp-")
    if (isJustNewTemp) {
      pendingTempIds.current.add(currentLastId!)
      if (isNearBottom) {
        scrollToBottom(true)
      }
      return
    }

    const isAppend = countIncreased && lastIdChanged && !currentLastId?.startsWith("temp-")
    if (isAppend && isNearBottom) {
      scrollToBottom(true)
    }
  }, [messages, searchQuery, isNearBottom])

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
    <div className="relative flex-1 min-h-0">
      <div
        ref={containerRef}
        className="absolute inset-0 overflow-y-auto px-3 sm:px-10 py-5 flex flex-col gap-2"
      >
        <div ref={sentinelRef} className="h-1 w-full" />

        {loadingMore && (
          <div className="flex justify-center py-2">
            <div className="neo-card rotate-1 rounded-lg bg-[var(--surface2)] px-4 py-2 text-xs font-semibold text-[var(--text3)] flex items-center gap-2">
              <span className="inline-block w-3 h-3 border-2 border-[var(--text3)] border-t-transparent rounded-full animate-spin" />
              Memuat pesan lama...
            </div>
          </div>
        )}

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
                    className="rounded-2xl transition-opacity duration-300"
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

      {!isNearBottom && (
        <button
          onClick={() => scrollToBottom(true)}
          className="neo-button absolute bottom-6 right-6 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-ink)] shadow-lg transition-transform hover:scale-105 active:scale-95"
          aria-label="Scroll ke bawah"
        >
          <FiArrowDown size={20} />
        </button>
      )}
    </div>
  )
}