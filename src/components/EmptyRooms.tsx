import { HiOutlineChatBubbleLeftRight } from "react-icons/hi2"

export default function EmptyRooms() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 px-8 text-center">
      <div
        className="w-14 h-14 rounded-2xl border flex items-center justify-center"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <HiOutlineChatBubbleLeftRight size={24} style={{ color: "var(--text3)" }} />
      </div>
      <p className="text-sm font-semibold font-sora" style={{ color: "var(--text)" }}>
        Belum ada room
      </p>
      <p className="text-xs leading-relaxed" style={{ color: "var(--text3)" }}>
        Tap tombol + untuk buat room pertamamu
      </p>
    </div>
  )
}