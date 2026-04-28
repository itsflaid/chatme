import { Message } from "@prisma/client"
import BubbleWrapper from "./BubbleWrapper"

type Props = {
  messages: Message[]
}

function getDateLabel(date: Date): string {
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === today.toDateString()) return "Hari ini"
  if (date.toDateString() === yesterday.toDateString()) return "Kemarin"
  return date.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
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

export default function ChatMessages({ messages }: Props) {
  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm" style={{ color: "var(--text3)" }}>
          Belum ada pesan. Mulai ketik sesuatu!
        </p>
      </div>
    )
  }

  const grouped = groupByDate(messages)

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2">
      {grouped.map((group) => (
        <div key={group.dateLabel}>
          <div className="flex justify-center my-3">
            <span
              className="text-[11px] px-3 py-1 rounded-full border"
              style={{
                color: "var(--text3)",
                background: "var(--surface)",
                borderColor: "var(--border)",
              }}
            >
              {group.dateLabel}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {group.messages.map((message) => (
              <BubbleWrapper key={message.id} message={message} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}