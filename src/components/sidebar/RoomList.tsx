import RoomItem from "./RoomItem"
import EmptyRooms from "./EmptyRooms"
import { MAX_PINNED_ROOMS } from "@/lib/roomPin"

type Room = {
  id: string
  name: string
  icon: string
  description: string | null
  isPinned: boolean
  pinnedAt: Date | null
  _count: { messages: number }
  messages: { text: string; createdAt: Date }[]
}

type Props = {
  rooms: Room[]
}

const EAGER_PREFETCH_COUNT = 3

export default function RoomList({ rooms }: Props) {
  if (rooms.length === 0) return <EmptyRooms />

  const pinnedCount = rooms.filter((r) => r.isPinned).length

  return (
    <div className="flex-1 overflow-y-auto bg-[var(--bg)] px-3 py-1 mb-2 ">
      {rooms.map((room, index) => (
        <RoomItem
          key={room.id}
          id={room.id}
          name={room.name}
          icon={room.icon}
          description={room.description}
          isPinned={room.isPinned}
          canPin={room.isPinned || pinnedCount < MAX_PINNED_ROOMS}
          pendingCount={room._count.messages}
          lastMessage={room.messages[0] ?? null}
          eagerPrefetch={index < EAGER_PREFETCH_COUNT}
        />
      ))}
      <div className="h-24 flex-shrink-0" />
    </div>
  )
}
