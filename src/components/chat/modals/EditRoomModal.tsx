"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { FiX } from "react-icons/fi"

const EMOJIS = ['💬','📚','🏪','💸','💭','🎯','📝','🛒','💡','🏋️','🎮','🎵','✈️','🍜','💊','📦','🔧','🌙','⚡','🎨']

type Props = {
  roomId: string
  initialName: string
  initialIcon: string
  initialDescription: string | null
  onClose: () => void
}

export default function EditRoomModal({
  roomId, initialName, initialIcon, initialDescription, onClose
}: Props) {
  const [name, setName] = useState(initialName)
  const [icon, setIcon] = useState(initialIcon)
  const [description, setDescription] = useState(initialDescription ?? "")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSave() {
    if (!name.trim()) return
    setLoading(true)
    await fetch(`/api/rooms/${roomId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), icon, description: description.trim() || null }),
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
      <div className="w-full max-w-md rounded-t-3xl p-6 pb-10 bg-[var(--surface)] border-t border-[var(--border2)]">
        <div className="w-9 h-1 rounded-full mx-auto mb-5 bg-[var(--border2)]" />

        <div className="flex items-center justify-between mb-5">
          <p className="font-semibold font-sora text-base text-[var(--text)]">Edit Room</p>
          <button onClick={onClose} className="text-[var(--text3)] hover:text-[var(--text)] transition-colors">
            <FiX size={20} />
          </button>
        </div>

        <label className="text-xs text-[var(--text3)] mb-1.5 block">Nama room *</label>
        <input
          className="w-full rounded-xl px-4 py-3 text-sm outline-none mb-4 border bg-[var(--surface2)] border-[var(--border2)] text-[var(--text)] placeholder:text-[var(--text3)] focus:border-[var(--accent)] transition-colors"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
        />

        <label className="text-xs text-[var(--text3)] mb-1.5 block">
          Deskripsi <span className="text-[var(--text3)]">(opsional)</span>
        </label>
        <input
          className="w-full rounded-xl px-4 py-3 text-sm outline-none mb-5 border bg-[var(--surface2)] border-[var(--border2)] text-[var(--text)] placeholder:text-[var(--text3)] focus:border-[var(--accent)] transition-colors"
          placeholder="Untuk apa room ini..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <label className="text-xs text-[var(--text3)] mb-2 block">Pilih ikon</label>
        <div className="grid grid-cols-7 gap-2 mb-6">
          {EMOJIS.map((e) => (
            <button
              key={e}
              onClick={() => setIcon(e)}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl border-2 transition-colors bg-[var(--surface2)]"
              style={{ borderColor: icon === e ? "var(--accent)" : "transparent" }}
            >
              {e}
            </button>
          ))}
        </div>

        <button
          onClick={handleSave}
          disabled={!name.trim() || loading}
          className="w-full py-3 rounded-xl font-semibold text-sm font-sora transition-opacity bg-[var(--accent)] text-[var(--bg)]"
          style={{ opacity: !name.trim() || loading ? 0.5 : 1 }}
        >
          {loading ? "Menyimpan..." : "Simpan"}
        </button>
      </div>
    </div>
  )
}