import RoomItem from "./RoomItem"
import EmptyRooms from "./EmptyRooms"
import ArchivedEntry from "./ArchivedEntry"
import { MAX_PINNED_ROOMS } from "@/lib/roomPin"

type Room = {
  id: string
  name: string
  icon: string
  description: string | null
  isPinned: boolean
  isArchived: boolean
  pinnedAt: Date | null
  _count: { messages: number }
  messages: { text: string; createdAt: Date }[]
}

type Props = {
  rooms: Room[]
  archivedCount: number
  onOpenArchive: () => void
}

const EAGER_PREFETCH_COUNT = 3

export default function RoomList({ rooms, archivedCount, onOpenArchive }: Props) {
  if (rooms.length === 0 && archivedCount === 0) return <EmptyRooms />

  const pinnedCount = rooms.filter((r) => r.isPinned).length

  return (
    <div className="flex-1 overflow-y-auto bg-[var(--bg)] px-3 py-1 mb-2 ">
      {rooms.length === 0 ? (
        <EmptyRooms />
      ) : (
        rooms.map((room, index) => (
          <RoomItem
            key={room.id}
            id={room.id}
            name={room.name}
            icon={room.icon}
            description={room.description}
            isPinned={room.isPinned}
            isArchived={room.isArchived}
            canPin={room.isPinned || pinnedCount < MAX_PINNED_ROOMS}
            pendingCount={room._count.messages}
            lastMessage={room.messages[0] ?? null}
            eagerPrefetch={index < EAGER_PREFETCH_COUNT}
          />
        ))
      )}
      {archivedCount > 0 && <ArchivedEntry count={archivedCount} onClick={onOpenArchive} />}
      <div className="h-24 flex-shrink-0" />
    </div>
  )
}
