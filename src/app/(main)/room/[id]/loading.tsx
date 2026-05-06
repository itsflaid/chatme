export default function RoomLoading() {
  return (
    <div className="flex flex-col" style={{ height: "100dvh", background: "var(--bg)" }}>

      <div className="flex items-center gap-3 px-4 py-3 border-b bg-[var(--surface)] border-[var(--border)]">
        <div className="w-8 h-8 rounded-lg bg-[var(--surface2)] animate-pulse" />
        <div className="w-10 h-10 rounded-full bg-[var(--surface2)] animate-pulse" />
        <div className="flex flex-col gap-2 flex-1">
          <div className="w-28 h-3 rounded-full bg-[var(--surface2)] animate-pulse" />
          <div className="w-20 h-2 rounded-full bg-[var(--surface2)] animate-pulse" />
        </div>
        <div className="w-6 h-6 rounded-full bg-[var(--surface2)] animate-pulse ml-auto" />
        <div className="w-6 h-6 rounded-full bg-[var(--surface2)] animate-pulse" />
      </div>

      <div className="flex-1 overflow-hidden px-4 py-4 flex flex-col gap-3">

        <div className="flex justify-center my-1">
          <div className="w-24 h-5 rounded-full bg-[var(--surface2)] animate-pulse" />
        </div>

        <div className="flex justify-end">
          <div className="flex flex-col items-end gap-1">
            <div className="h-10 w-48 rounded-[18px_18px_4px_18px] bg-[var(--accent)] opacity-20 animate-pulse" />
            <div className="w-12 h-2 rounded-full bg-[var(--surface2)] animate-pulse" />
          </div>
        </div>

        <div className="flex justify-end">
          <div className="flex flex-col items-end gap-1">
            <div className="h-16 w-64 rounded-[18px_18px_4px_18px] bg-[var(--accent)] opacity-20 animate-pulse" />
            <div className="w-12 h-2 rounded-full bg-[var(--surface2)] animate-pulse" />
          </div>
        </div>

        <div className="flex items-end gap-2 mt-1">
          <div className="w-8 h-8 rounded-full bg-[var(--surface2)] animate-pulse flex-shrink-0" />
          <div className="h-10 w-44 rounded-[18px_18px_18px_4px] bg-[var(--surface2)] animate-pulse" />
        </div>

        <div className="flex justify-center my-1">
          <div className="w-16 h-5 rounded-full bg-[var(--surface2)] animate-pulse" />
        </div>

        <div className="flex justify-end">
          <div className="flex flex-col items-end gap-1">
            <div className="h-10 w-56 rounded-[18px_18px_4px_18px] bg-[var(--accent)] opacity-20 animate-pulse" />
            <div className="w-12 h-2 rounded-full bg-[var(--surface2)] animate-pulse" />
          </div>
        </div>

        <div className="flex justify-end">
          <div className="flex flex-col items-end gap-1">
            <div className="h-10 w-36 rounded-[18px_18px_4px_18px] bg-[var(--accent)] opacity-20 animate-pulse" />
            <div className="w-12 h-2 rounded-full bg-[var(--surface2)] animate-pulse" />
          </div>
        </div>

      </div>

      <div className="flex items-end gap-3 px-4 pb-6">
        <div className="flex-1 h-10 rounded-2xl bg-[var(--surface2)] animate-pulse" />
        <div className="w-10 h-10 rounded-full bg-[var(--accent)] opacity-20 animate-pulse" />
      </div>

    </div>
  )
}