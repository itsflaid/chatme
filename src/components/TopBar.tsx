type Props = {
  userName: string | null | undefined
}

export default function Topbar({ userName }: Props) {
  const initial = userName?.charAt(0).toUpperCase() ?? "?"

  return (
    <div
      className="flex items-center justify-between px-5 py-4 border-b"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      <h1 className="text-lg font-bold font-sora" style={{ color: "var(--text)" }}>
        Chat<span style={{ color: "var(--accent)" }}>me</span>
      </h1>
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs font-sora"
        style={{ background: "var(--accent)", color: "var(--bg)" }}
      >
        {initial}
      </div>
    </div>
  )
}