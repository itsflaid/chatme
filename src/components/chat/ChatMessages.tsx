"use client"

import { useEffect, useRef } from "react"
import { Message } from "@prisma/client"
import BubbleWrapper from "../chat/bubble/BubbleWrapper"
import BotBubble from "../chat/bubble/BotBubble"

type Props = {
  messages: Message[]
  onBotDone: (botMessageId: string, sourceMessageId: string) => void
  onBotSnooze: (botMessageId: string, sourceMessageId: string) => void
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

export default function ChatMessages({ messages, onBotDone, onBotSnooze }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  // scroll ke bawah setiap messages berubah
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

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
              if (message.isBot) {
                const sourceMessage = message.sourceMessageId
                  ? messages.find((m) => m.id === message.sourceMessageId) ?? null
                  : null
                return (
                  <BotBubble
                    key={message.id}
                    message={message}
                    sourceMessage={sourceMessage}
                    onDone={() => onBotDone(message.id, message.sourceMessageId!)}
                    onSnooze={() => onBotSnooze(message.id, message.sourceMessageId!)}
                  />
                )
              }
              return <BubbleWrapper key={message.id} message={message} />
            })}
          </div>
        </div>
      ))}

      {/* anchor scroll otomatis */}
      <div ref={bottomRef} />
    </div>
  )
}