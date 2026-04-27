import Link from "next/link"

type Props = {
  id: string
  name: string
  icon: string
  pendingCount: number
}

export default function RoomItem({ id, name, icon, pendingCount }: Props) {
  return (
    <Link
      href={`/room/${id}`}
      className="flex items-center gap-3 px-4 py-3.5 border-b transition-colors cursor-pointer hover:opacity-80 border-[var(--border)]"
    >
      <div
        className="w-11 h-11 rounded-2xl border flex items-center justify-center text-xl flex-shrink-0 bg-[var(--surface2)] border-[var(--border)]"
      >
        {icon}
      </div>

      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-semibold font-sora truncate text-[var(--text)]"
        >
          {name}
        </p>
        <p className="text-xs mt-0.5 text-[var(--text3)]">
          Tap untuk buka
        </p>
      </div>

      {pendingCount > 0 && (
        <div
          className="text-xs font-bold px-2 py-0.5 rounded-full font-sora flex-shrink-0 bg-[var(--accent)] text-[var(--bg)]"
        >
          {pendingCount}
        </div>
      )}
    </Link>
  )
}