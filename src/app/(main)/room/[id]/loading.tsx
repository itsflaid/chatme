export default function RoomLoading() {
  return (
    <div className="flex flex-col h-full bg-[var(--bg)]">

      <div className="flex items-center gap-3 px-4 py-3 border-b bg-[var(--surface)] border-[var(--border)]">
        <div className="w-8 h-8 rounded-lg bg-[var(--surface2)] animate-pulse" />
        <div className="w-10 h-10 rounded-full bg-[var(--surface2)] animate-pulse" />
        <div className="flex flex-col gap-2 flex-1">
          <div className="w-28 h-3 rounded-full bg-[var(--surface2)] animate-pulse" />
          <div className="w-16 h-2 rounded-full bg-[var(--surface2)] animate-pulse" />
        </div>
      </div>

      <div className="flex-1 px-6 py-4 flex flex-col gap-4 justify-end">
        {[65, 45, 75, 50].map((w, i) => (
          <div key={i} className="flex justify-end">
            <div
              className="h-10 rounded-[18px_18px_4px_18px] animate-pulse bg-[var(--surface2)]"
              style={{ width: `${w}%` }}
            />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 px-4 pb-6">
        <div className="flex-1 h-10 rounded-2xl bg-[var(--surface2)] animate-pulse" />
        <div className="w-10 h-10 rounded-full bg-[var(--surface2)] animate-pulse" />
      </div>

    </div>
  )
}