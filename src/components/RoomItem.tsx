import Link from "next/link"

type Props = {
  id: string
  name: string
  icon: string
  pendingCount: number
}

export default function RoomItem({ 
  id, 
  name, 
  icon, 
  pendingCount, 
}: Props) {
  return (
    <Link
      href={`/room/${id}`}
      className={`
        flex items-center gap-3 px-4 py-3.5 
        transition-all duration-200 cursor-pointer
        hover:bg-[var(--surface2)] bg-transparent
      `}
    >
      <div
        className={`
          w-11 h-11 rounded-full 
          flex items-center justify-center 
          text-xl flex-shrink-0 
          bg-[var(--surface2)] 
          border border-[var(--border)]
          overflow-hidden
        `}
      >
        {icon}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold font-sora truncate text-[var(--text)]">
          {name}
        </p>
        <p className="text-xs mt-0.5 text-[var(--text3)]">
          Tap untuk buka
        </p>
      </div>

      {pendingCount > 0 && (
        <div
          className="
            min-w-[20px] h-5 
            aspect-square
            flex items-center justify-center
            text-[10px] font-bold font-sora
            rounded-full 
            bg-[var(--accent)] 
            text-[var(--bg)]
            flex-shrink-0
            ring-2 ring-[var(--bg)]
          "
        >
          {pendingCount}
        </div>
      )}
    </Link>
  )
}