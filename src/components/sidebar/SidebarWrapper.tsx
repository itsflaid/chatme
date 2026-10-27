"use client"

import { useMemo } from "react"
import useRooms from "@/hooks/useRooms"
import RoomList from "./RoomList"
import ArchivedRoomList from "./ArchivedRoomList"

export type SidebarView = "active" | "archived"

type ServerRoom = {
  id: string
  name: string
  icon: string
  description: string | null
  isPinned: boolean
  pinnedAt: string | null
  isArchived: boolean
  archivedAt: string | null
  userId: string
  createdAt: string
  updatedAt: string
  _count: { messages: number }
  messages: { text: string; createdAt: string }[]
}

type Props = {
  serverRooms?: ServerRoom[]
  searchQuery?: string
  view: SidebarView
  onViewChange: (view: SidebarView) => void
}

export default function SidebarWrapper({ serverRooms, searchQuery = "", view, onViewChange }: Props) {
  const initialRooms = useMemo(
    () =>
      serverRooms?.map((r) => ({
        ...r,
        pinnedAt: r.pinnedAt ? new Date(r.pinnedAt) : null,
        archivedAt: r.archivedAt ? new Date(r.archivedAt) : null,
        createdAt: new Date(r.createdAt),
        updatedAt: new Date(r.updatedAt),
        messages: r.messages.map((m) => ({
          ...m,
          createdAt: new Date(m.createdAt),
        })),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  const { rooms, loading } = useRooms(initialRooms)

  const { activeRooms, archivedRooms } = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    const matched = q ? rooms.filter((r) => r.name.toLowerCase().includes(q)) : rooms
    return {
      activeRooms: matched.filter((r) => !r.isArchived),
      archivedRooms: matched.filter((r) => r.isArchived),
    }
  }, [rooms, searchQuery])

  if (loading && rooms.length === 0) {
    return <SidebarSkeleton />
  }

  if (view === "archived") {
    return <ArchivedRoomList rooms={archivedRooms} onBack={() => onViewChange("active")} />
  }

  return (
    <RoomList
      rooms={activeRooms}
      archivedCount={archivedRooms.length}
      onOpenArchive={() => onViewChange("archived")}
    />
  )
}

function SidebarSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto bg-[var(--bg)] px-3 py-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="neo-card mb-3 flex items-center gap-3 rounded-xl px-3 py-3"
        >
          <div className="w-12 h-12 rounded-lg bg-[var(--surface2)] animate-pulse" />
          <div className="flex-1 flex flex-col gap-2">
            <div className="w-28 h-3 rounded-full bg-[var(--surface2)] animate-pulse" />
            <div className="w-20 h-2 rounded-full bg-[var(--surface2)] animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  )
}