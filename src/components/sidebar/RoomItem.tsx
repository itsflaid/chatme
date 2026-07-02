"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useCallback } from "react"

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
  const router = useRouter()
  const isActive = pathname === `/room/${id}`

  const handleMouseEnter = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (!isActive) e.currentTarget.style.background = "var(--surface3)"
      router.prefetch(`/room/${id}`)
    },
    [id, isActive, router]
  )

  return (
    <Link
      href={`/room/${id}`}
      className="neo-card mb-3 flex items-center gap-3 rounded-xl px-3 py-3 transition-all duration-150 cursor-pointer relative hover:-translate-x-0.5 hover:-translate-y-0.5"
      style={{
        background: isActive ? "var(--accent)" : "var(--surface)",
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={(e) => {
        if (!isActive) e.currentTarget.style.background = "var(--surface)"
      }}
    >
      {isActive && (
        <div className="absolute -left-2 top-3 h-5 w-5 rotate-12 rounded-md border-2 border-[var(--neo-line)] bg-[var(--bg)]" />
      )}

      <div
        className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl flex-shrink-0 neo-button"
        style={{
          background: isActive ? "var(--bg)" : "var(--surface2)",
        }}
      >
        {icon}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <p
            className="text-sm font-semibold font-sora truncate"
            style={{ color: isActive ? "var(--accent-ink)" : "var(--text)" }}
          >
            {name}
          </p>
          {lastMessage && (
            <span className="text-[11px] flex-shrink-0" style={{ color: isActive ? "var(--accent-ink)" : "var(--text3)" }}>
              {formatTime(new Date(lastMessage.createdAt))}
            </span>
          )}
        </div>

        <p
          className="text-xs truncate"
          style={{ color: isActive ? "var(--accent-ink)" : "var(--text3)" }}
        >
          {lastMessage ? lastMessage.text : "Belum ada catatan"}
        </p>
      </div>

      {pendingCount > 0 && (
        <div
          className="rounded-md border-2 border-[var(--neo-line)] px-2 py-0.5 text-[11px] font-bold font-sora flex-shrink-0 shadow-[2px_2px_0_var(--neo-shadow)]"
          style={{
            background: isActive ? "var(--accent-ink)" : "var(--accent)",
            color: isActive ? "var(--accent)" : "var(--accent-ink)",
          }}
        >
          {pendingCount}
        </div>
      )}
    </Link>
  )
}