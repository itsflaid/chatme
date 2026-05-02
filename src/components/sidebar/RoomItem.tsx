"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

type Props = {
  id: string
  name: string
  icon: string
  pendingCount: number
  lastMessage: { text: string; createdAt: Date } | null
}

function formatTime(date: Date): string {
  const now = new Date()
  const d = new Date(date)
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
  }
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return "Kemarin"
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" })
}

export default function RoomItem({ id, name, icon, pendingCount, lastMessage }: Props) {
  const pathname = usePathname()
  const isActive = pathname === `/room/${id}`

  return (
    <Link
      href={`/room/${id}`}
      className="flex items-center gap-3 px-4 py-3.5 border-b transition-all duration-150 cursor-pointer relative"
      style={{
        borderColor: "var(--border)",
        background: isActive ? "var(--surface2)" : "transparent",
      }}
      onMouseEnter={e => {
        if (!isActive) e.currentTarget.style.background = "var(--surface)"
      }}
      onMouseLeave={e => {
        if (!isActive) e.currentTarget.style.background = "transparent"
      }}
    >
      {isActive && (
        <div
          className="absolute left-0 top-0 bottom-0 w-[3px] rounded-r-full"
          style={{ background: "var(--accent)" }}
        />
      )}

      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 border"
        style={{
          background: isActive ? "var(--surface3)" : "var(--surface2)",
          borderColor: isActive ? "var(--accent)" : "var(--border)",
        }}
      >
        {icon}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <p
            className="text-sm font-semibold font-sora truncate"
            style={{ color: isActive ? "var(--accent)" : "var(--text)" }}
          >
            {name}
          </p>
          {lastMessage && (
            <span className="text-[11px] flex-shrink-0" style={{ color: "var(--text3)" }}>
              {formatTime(new Date(lastMessage.createdAt))}
            </span>
          )}
        </div>

        <p
          className="text-xs truncate"
          style={{ color: isActive ? "var(--text2)" : "var(--text3)" }}
        >
          {lastMessage ? lastMessage.text : "Belum ada pesan"}
        </p>
      </div>

      {pendingCount > 0 && (
        <div
          className="text-[11px] font-bold px-2 py-0.5 rounded-full font-sora flex-shrink-0"
          style={{ background: "var(--accent)", color: "var(--bg)" }}
        >
          {pendingCount}
        </div>
      )}
    </Link>
  )
}