// Konten kanan default saat belum pilih room
import { HiOutlineChatBubbleLeftRight } from "react-icons/hi2"

export default function HomePage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3" style={{ background: "var(--bg)" }}>
      <div
        className="w-16 h-16 rounded-2xl border flex items-center justify-center"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <HiOutlineChatBubbleLeftRight size={28} style={{ color: "var(--text3)" }} />
      </div>
      <p className="text-sm font-semibold font-sora" style={{ color: "var(--text)" }}>
        Pilih room untuk mulai
      </p>
      <p className="text-xs" style={{ color: "var(--text3)" }}>
        atau buat room baru
      </p>
    </div>
  )
}