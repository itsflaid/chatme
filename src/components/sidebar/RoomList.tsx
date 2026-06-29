import { useEffect } from "react"
import RoomItem from "./RoomItem"
import EmptyRooms from "./EmptyRooms"

type Room = {
  id: string
  name: string
  icon: string
  _count: { messages: number }
  messages: { text: string; createdAt: Date }[]
}

type Props = {
  rooms: Room[]
}

export default function RoomList({ rooms }: Props) {
  useEffect(() => {
    if (rooms.length === 0) return
    const handle = requestIdleCallback(() => {
      rooms.forEach((room) => {
        fetch(`/api/rooms/${room.id}/messages?limit=30`, {
          method: "GET",
        }).catch(() => {})
      })
    }, { timeout: 2000 })
    return () => cancelIdleCallback(handle)
  }, [rooms])

  if (rooms.length === 0) return <EmptyRooms />

  return (
    <div className="flex-1 overflow-y-auto bg-[var(--bg)] px-3 mb-2 ">
      {rooms.map((room) => (
        <RoomItem
          key={room.id}
          id={room.id}
          name={room.name}
          icon={room.icon}
          pendingCount={room._count.messages}
          lastMessage={room.messages[0] ?? null}
        />
      ))}
      {/* spacer bawah — sama dengan pt-2 di atas, ditambah clearance tombol + */}
      <div className="h-24 flex-shrink-0" />
    </div>
  )
}