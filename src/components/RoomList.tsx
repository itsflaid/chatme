import RoomItem from "./RoomItem"
import EmptyRooms from "./EmptyRooms"

type Room = {
  id: string
  name: string
  icon: string
  _count: { messages: number }
}

type Props = {
  rooms: Room[]
  selectedRoomId?: string
}

export default function RoomList({ rooms, selectedRoomId }: Props) {
  if (rooms.length === 0) return <EmptyRooms />

  return (
    <div className="flex-1 overflow-y-auto bg-[var(--bg)]">
      {rooms.map((room) => (
        <RoomItem
          key={room.id}
          id={room.id}
          name={room.name}
          icon={room.icon}
          pendingCount={room._count.messages}
          isSelected={room.id === selectedRoomId} 
        />
      ))}
    </div>
  )
}