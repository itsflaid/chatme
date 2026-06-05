import ThemeToggle from "@/components/theme/ThemeToggle"

type Props = {
  userName: string | null | undefined
}

export default function Topbar({ userName }: Props) {
  const initial = userName?.charAt(0).toUpperCase() ?? "?"

  return (
    <div
      className="m-3 mb-2 flex items-center justify-between rounded-xl bg-[var(--surface)] px-4 py-3 neo-panel"
    >
      <h1 className="text-lg font-bold font-sora text-[var(--text)]">
        Chat<span className="text-[var(--accent)]">me</span>
      </h1>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs font-sora bg-[var(--accent)] text-[var(--bg)] neo-button"
        >
          {initial}
        </div>
      </div>
    </div>
  )
}
