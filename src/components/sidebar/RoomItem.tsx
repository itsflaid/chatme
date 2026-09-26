"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"
import { FiBookmark } from "react-icons/fi"
import { trpc } from "@/lib/trpc"
import { getRoomIconSrc } from "@/lib/roomIcons"
import { PIN_LIMIT_MESSAGE } from "@/lib/roomPin"
import { useTogglePinRoom } from "@/hooks/useRooms"
import RoomItemMenu from "./RoomItemMenu"
import EditRoomModal from "@/components/chat/modals/EditRoomModal"
import DeleteRoomModal from "@/components/chat/modals/DeleteRoomModal"

type Props = {
  id: string
  name: string
  icon: string
  description: string | null
  isPinned: boolean
  canPin: boolean
  pendingCount: number
  lastMessage: { text: string; createdAt: Date } | null
  eagerPrefetch?: boolean
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

export default function RoomItem({
  id,
  name,
  icon,
  description,
  isPinned,
  canPin,
  pendingCount,
  lastMessage,
  eagerPrefetch = false,
}: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const isActive = pathname === `/room/${id}`
  const utils = trpc.useUtils()
  const togglePin = useTogglePinRoom()
  const linkRef = useRef<HTMLAnchorElement>(null)
  const hasPrefetched = useRef(false)
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null)
  const [showEdit, setShowEdit] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [pinError, setPinError] = useState<string | null>(null)
  const touchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pinErrorTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const suppressNextClick = useRef(false)

  const showPinError = useCallback((message: string) => {
    setPinError(message)
    if (pinErrorTimer.current) clearTimeout(pinErrorTimer.current)
    pinErrorTimer.current = setTimeout(() => setPinError(null), 3000)
  }, [])

  useEffect(() => {
    return () => {
      if (pinErrorTimer.current) clearTimeout(pinErrorTimer.current)
    }
  }, [])

  function handleTogglePin() {
    if (!isPinned && !canPin) {
      showPinError(PIN_LIMIT_MESSAGE)
      return
    }
    togglePin.mutate(
      { id, isPinned: !isPinned },
      { onError: (err) => showPinError(err.message || PIN_LIMIT_MESSAGE) }
    )
  }

  function openMenu(x: number, y: number) {
    setMenuPos({ x, y })
  }

  function handleTouchStart(e: React.TouchEvent) {
    const touch = e.touches[0]
    touchTimer.current = setTimeout(() => {
      suppressNextClick.current = true
      openMenu(touch.clientX, touch.clientY)
    }, 500)
  }

  function handleTouchEnd() {
    if (touchTimer.current) {
      clearTimeout(touchTimer.current)
      touchTimer.current = null
    }
  }

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault()
    suppressNextClick.current = true
    openMenu(e.clientX, e.clientY)
  }

  const prefetchRoom = useCallback(() => {
    if (hasPrefetched.current) return
    hasPrefetched.current = true
    router.prefetch(`/room/${id}`)
    utils.message.list.prefetchInfinite({ roomId: id, limit: 50 })
  }, [id, router, utils])

  useEffect(() => {
    const el = linkRef.current
    if (!el) return

    if (eagerPrefetch) {
      prefetchRoom()
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          prefetchRoom()
          observer.disconnect()
        }
      },
      { rootMargin: "200px" }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [eagerPrefetch, prefetchRoom])

  const handleMouseEnter = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (!isActive) e.currentTarget.style.background = "var(--surface3)"
      prefetchRoom()
    },
    [isActive, prefetchRoom]
  )

  const handlePointerDown = useCallback(() => {
    prefetchRoom()
  }, [prefetchRoom])

  return (
    <Link
      ref={linkRef}
      href={`/room/${id}`}
      className="neo-card mb-3 flex items-center gap-3 rounded-xl px-3 py-3 transition-all duration-150 cursor-pointer relative hover:-translate-x-0.5 hover:-translate-y-0.5"
      style={{
        background: isActive ? "var(--accent)" : "var(--surface)",
      }}
      onMouseEnter={handleMouseEnter}
      onPointerDown={handlePointerDown}
      onMouseLeave={(e) => {
        if (!isActive) e.currentTarget.style.background = "var(--surface)"
      }}
      onClick={(e) => {
        if (suppressNextClick.current) {
          e.preventDefault()
          suppressNextClick.current = false
        }
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchEnd}
      onContextMenu={handleContextMenu}
    >
      {isActive && (
        <div className="absolute -left-2 top-3 h-5 w-5 rotate-12 rounded-md border-2 border-[var(--neo-line)] bg-[var(--bg)]" />
      )}
      {isPinned && (
        <div className="absolute -left-2 top-1/2 z-10 -translate-y-1/2" title="Disematkan" aria-label="Room disematkan">
          <div className="flex h-6 w-6 -rotate-6 items-center justify-center rounded-md border-2 border-[var(--neo-line)] bg-[var(--accent)] shadow-[2px_2px_0_var(--neo-shadow)]">
            <FiBookmark size={11} className="text-[var(--accent-ink)]" aria-hidden="true" />
          </div>
        </div>
      )}

      <div
        className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 neo-button !p-0 overflow-hidden"
      >
        <Image
          src={getRoomIconSrc(icon)}
          alt={icon}
          width={46}
          height={46}
          className="object-contain"
          unoptimized
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <p
            className="text-sm font-semibold font-sora truncate"
            style={{ color: isActive ? "var(--accent-ink)" : "var(--text)" }}
          >
            <span className="truncate">{name}</span>
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

      {menuPos && (
        <RoomItemMenu
          x={menuPos.x}
          y={menuPos.y}
          isPinned={isPinned}
          onTogglePin={handleTogglePin}
          onInfo={() => router.push(`/room/${id}/info`)}
          onEdit={() => setShowEdit(true)}
          onDelete={() => setShowDelete(true)}
          onClose={() => setMenuPos(null)}
        />
      )}
      {pinError && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 neo-panel rounded-xl bg-[var(--surface2)] px-4 py-2.5 text-sm font-medium text-[#fca5a5]">
          {pinError}
        </div>
      )}
      {showEdit && (
        <EditRoomModal roomId={id} initialName={name} initialIcon={icon} initialDescription={description} onClose={() => setShowEdit(false)} />
      )}
      {showDelete && (
        <DeleteRoomModal roomId={id} roomName={name} onClose={() => setShowDelete(false)} />
      )}
    </Link>
  )
}
