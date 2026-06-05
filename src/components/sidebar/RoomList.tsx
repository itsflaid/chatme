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
  if (rooms.length === 0) return <EmptyRooms />

  return (
    <div className="flex-1 overflow-y-auto bg-[var(--bg)] px-3 py-2">
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
    </div>
  )
}
