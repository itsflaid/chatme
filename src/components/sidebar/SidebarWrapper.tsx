"use client"

import useRooms from "@/hooks/useRooms"
import RoomList from "./RoomList"

type ServerRoom = {
  id: string
  name: string
  icon: string
  _count: { messages: number }
  messages: { text: string; createdAt: string }[]
}

type Props = {
  serverRooms?: ServerRoom[]
}

export default function SidebarWrapper({ serverRooms }: Props) {
  // Kalau serverRooms ada → rooms langsung tersedia, loading = false
  // Kalau tidak ada → hook fetch sendiri dari client (fallback)
  const initialRooms = serverRooms?.map((r) => ({
    ...r,
    messages: r.messages.map((m) => ({
      ...m,
      createdAt: new Date(m.createdAt),
    })),
  }))

  const { rooms, loading } = useRooms(initialRooms)

  if (loading && rooms.length === 0) {
    return <SidebarSkeleton />
  }

  return <RoomList rooms={rooms} />
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