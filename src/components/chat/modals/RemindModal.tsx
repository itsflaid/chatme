"use client"

import { useState } from "react"
import { FiBell, FiX } from "react-icons/fi"
import { trpc } from "@/lib/trpc"

type Props = {
  messageId: string
  messageText: string
  onClose: () => void
  onSave?: (remindAt: Date) => void
}

export default function RemindModal({ messageId, messageText, onClose, onSave }: Props) {
  const utils = trpc.useUtils()
  const [datetime, setDatetime] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSave() {
    if (!datetime) return
    setLoading(true)
    const remindAt = new Date(datetime)

    if ("Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission()
    }

    if (onSave) {
      onSave(remindAt)
      setLoading(false)
      onClose()
      return
    }

    await utils.message.update.mutate({ id: messageId, remindAt: remindAt.toISOString() })
    setLoading(false)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: "#00000070", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-md rounded-t-3xl p-6 pb-10 bg-[var(--surface)] border-t border-[var(--border2)]"
      >
        <div className="w-9 h-1 rounded-full mx-auto mb-5 bg-[var(--border2)]" />

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FiBell size={16} className="text-[var(--accent)]" />
            <p className="font-semibold font-sora text-sm text-[var(--text)]">Set Pengingat</p>
          </div>
          <button onClick={onClose} className="text-[var(--text3)]">
            <FiX size={18} />
          </button>
        </div>

        <div
          className="rounded-xl px-4 py-3 mb-5 border text-sm text-[var(--text2)]"
          style={{ background: "var(--surface2)", borderColor: "var(--border2)" }}
        >
          {messageText.length > 60 ? messageText.slice(0, 60) + "..." : messageText}
        </div>

        <label className="text-xs mb-1.5 block text-[var(--text3)]">Ingatkan pada</label>
        <input
          type="datetime-local"
          className="w-full rounded-xl px-4 py-3 text-sm outline-none border mb-5 transition-colors bg-[var(--surface2)] text-[var(--text)]"
          style={{ borderColor: datetime ? "var(--accent)" : "var(--border2)" }}
          value={datetime}
          onChange={(e) => setDatetime(e.target.value)}
        />

        <button
          onClick={handleSave}
          disabled={!datetime || loading}
          className="w-full py-3 rounded-xl font-semibold text-sm font-sora transition-opacity bg-[var(--accent)] text-[var(--accent-ink)]"
          style={{ opacity: !datetime || loading ? 0.5 : 1 }}
        >
          {loading ? "Menyimpan..." : "Simpan Pengingat"}
        </button>
      </div>
    </div>
  )
}
