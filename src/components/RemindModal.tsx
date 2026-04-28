// Modal set reminder — muncul setelah tap "Ingatkan" di context menu
// User pilih tanggal & jam, lalu disimpan ke DB
// "use client"

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { FiBell, FiX } from "react-icons/fi"

type Props = {
  messageId: string
  messageText: string
  onClose: () => void
}

export default function RemindModal({ messageId, messageText, onClose }: Props) {
  const [datetime, setDatetime] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSave() {
    if (!datetime) return
    setLoading(true)
    await fetch(`/api/messages/${messageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ remindAt: new Date(datetime).toISOString() }),
    })
    setLoading(false)
    onClose()
    router.refresh()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: "#00000070", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-md rounded-t-3xl p-6 pb-10"
        style={{ background: "var(--surface)", borderTop: "1px solid var(--border2)" }}
      >
        {/* handle */}
        <div className="w-9 h-1 rounded-full mx-auto mb-5 bg-[var(--border2)]" />

        {/* header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FiBell size={16} style={{ color: "var(--accent)" }} />
            <p className="font-semibold font-sora text-sm" style={{ color: "var(--text)" }}>
              Set Pengingat
            </p>
          </div>
          <button onClick={onClose} style={{ color: "var(--text3)" }}>
            <FiX size={18} />
          </button>
        </div>

        {/* preview pesan */}
        <div
          className="rounded-xl px-4 py-3 mb-5 border text-sm"
          style={{
            background: "var(--surface2)",
            borderColor: "var(--border2)",
            color: "var(--text2)",
          }}
        >
          {messageText.length > 60 ? messageText.slice(0, 60) + "..." : messageText}
        </div>

        {/* datetime picker */}
        <label className="text-xs mb-1.5 block" style={{ color: "var(--text3)" }}>
          Ingatkan pada
        </label>
        <input
          type="datetime-local"
          className="w-full rounded-xl px-4 py-3 text-sm outline-none border mb-5 transition-colors"
          style={{
            background: "var(--surface2)",
            borderColor: datetime ? "var(--accent)" : "var(--border2)",
            color: "var(--text)",
          }}
          value={datetime}
          onChange={(e) => setDatetime(e.target.value)}
        />

        {/* submit */}
        <button
          onClick={handleSave}
          disabled={!datetime || loading}
          className="w-full py-3 rounded-xl font-semibold text-sm font-sora transition-opacity"
          style={{
            background: "var(--accent)",
            color: "var(--bg)",
            opacity: !datetime || loading ? 0.5 : 1,
          }}
        >
          {loading ? "Menyimpan..." : "Simpan Pengingat"}
        </button>
      </div>
    </div>
  )
}