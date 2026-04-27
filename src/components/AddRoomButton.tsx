"use client"

import { useState } from "react"
import { FiPlus, FiX } from "react-icons/fi"
import { useRouter } from "next/navigation"

const EMOJIS = ['💬','📚','🏪','💸','💭','🎯','📝','🛒','💡','🏋️','🎮','🎵','✈️','🍜','💊','📦','🔧','🌙','⚡','🎨']

export default function AddRoomButton() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [icon, setIcon] = useState("💬")
  const [description, setDescription] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  function handleClose() {
    setOpen(false)
    setName("")
    setIcon("💬")
    setDescription("")
  }

  async function handleCreate() {
    if (!name.trim()) return
    setLoading(true)
    await fetch("/api/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), icon, description: description.trim() || null }),
    })
    setLoading(false)
    handleClose()
    router.refresh()
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="absolute bottom-12 right-6 w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110 z-10 bg-[var(--accent)] text-[var(--bg)]"
      >
        <FiPlus size={22} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: "#00000070", backdropFilter: "blur(4px)" }}
          onClick={(e) => e.target === e.currentTarget && handleClose()}
        >
          <div
            className="w-full max-w-md rounded-t-3xl p-6 pb-10 bg-[var(--surface)] border-t border-[var(--border2)]"
          >
            <div className="w-9 h-1 rounded-full mx-auto mb-5 bg-[var(--border2)]" />

            <div className="flex items-center justify-between mb-5">
              <p className="font-semibold font-sora text-base text-[var(--text)]">Buat Room Baru</p>
              <button onClick={handleClose} className="text-[var(--text3)] hover:text-[var(--text)] transition-colors">
                <FiX size={20} />
              </button>
            </div>

            <label className="text-xs text-[var(--text3)] mb-1.5 block">Nama room *</label>
            <input
              className="w-full rounded-xl px-4 py-3 text-sm outline-none mb-4 border bg-[var(--surface2)] border-[var(--border2)] text-[var(--text)] placeholder:text-[var(--text3)] focus:border-[var(--accent)] transition-colors"
              placeholder="Contoh: Tugas, Warung, Random..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
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
              onClick={handleCreate}
              disabled={!name.trim() || loading}
              className="w-full py-3 rounded-xl font-semibold text-sm font-sora transition-opacity bg-[var(--accent)] text-[var(--bg)]"
              style={{ opacity: !name.trim() || loading ? 0.5 : 1 }}
            >
              {loading ? "Membuat..." : "Buat Room"}
            </button>
          </div>
        </div>
      )}
    </>
  )
}