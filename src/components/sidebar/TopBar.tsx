import ThemeToggle from "@/components/theme/ThemeToggle"

type Props = {
  userName: string | null | undefined
}

export default function Topbar({ userName }: Props) {
  const initial = userName?.charAt(0).toUpperCase() ?? "?"

  return (
    <div
      className="flex items-center justify-between px-5 py-4 border-b bg-[var(--surface)] border-[var(--border)]"
    >
      <h1 className="text-lg font-bold font-sora text-[var(--text)]">
        Chat<span className="text-[var(--accent)]">me</span>
      </h1>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs font-sora bg-[var(--accent)] text-[var(--bg)]"
        >
          {initial}
        </div>
      </div>
    </div>
  )
}
