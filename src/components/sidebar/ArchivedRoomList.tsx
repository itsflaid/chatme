import { FiArrowLeft } from "react-icons/fi"
import type { RoomData } from "@/hooks/useRooms"
import RoomItem from "./RoomItem"

type Props = {
  rooms: RoomData[]
  onBack: () => void
}

export default function ArchivedRoomList({ rooms, onBack }: Props) {
  return (
    <div className="flex-1 overflow-y-auto bg-[var(--bg)] px-3 py-1 mb-2">
      <button
        type="button"
        onClick={onBack}
        className="neo-button mb-3 flex w-full items-center gap-3 rounded-xl bg-[var(--surface2)] px-4 py-3 text-left"
      >
        <FiArrowLeft size={16} className="flex-shrink-0 text-[var(--text2)]" aria-hidden="true" />
        <span className="flex-1 text-sm font-semibold font-sora text-[var(--text)]">Diarsipkan</span>
        <span className="text-xs text-[var(--text3)]">{rooms.length}</span>
      </button>

      {rooms.length === 0 ? (
        <p className="py-16 text-center text-xs text-[var(--text3)]">Tidak ada room yang diarsipkan</p>
      ) : (
        rooms.map((room) => (
          <RoomItem
            key={room.id}
            id={room.id}
            name={room.name}
            icon={room.icon}
            description={room.description}
            isPinned={false}
            isArchived
            canPin={false}
            pendingCount={room._count.messages}
            lastMessage={room.messages[0] ?? null}
          />
        ))
      )}
      <div className="h-24 flex-shrink-0" />
    </div>
  )
}
