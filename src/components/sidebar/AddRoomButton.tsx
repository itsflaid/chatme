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
    const res = await fetch("/api/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), icon, description: description.trim() || null }),
    })
    setLoading(false)
    handleClose()
    if (res.ok) {
      const room = await res.json()
      window.dispatchEvent(new Event("rooms:refresh"))
      router.push(`/room/${room.id}`)
    }
  }

  return (
    <>
      {/* Gradient fade biar list terkesan fade ke bawah, bukan ke-cut */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-24 z-10"
        style={{ background: "linear-gradient(to top, var(--bg) 15%, transparent)" }}
      />

      {/* FAB absolute — tidak makan space layout, list room full */}
      <button
        onClick={() => setOpen(true)}
        className="neo-button absolute bottom-6 right-5 z-20 flex h-12 w-12 rotate-3 items-center justify-center rounded-xl bg-[var(--accent)] text-[var(--accent-ink)] transition-all duration-200 hover:rotate-12"
      >
        <FiPlus size={22} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: "#00000070", backdropFilter: "blur(4px)" }}
          onClick={(e) => e.target === e.currentTarget && handleClose()}
        >
          <div className="neo-panel w-[calc(100%-24px)] max-w-md rounded-2xl bg-[var(--surface)] p-6 pb-8">
            <div className="w-12 h-2 rotate-1 rounded-md mx-auto mb-5 bg-[var(--accent)] border-2 border-[var(--neo-line)]" />

            <div className="flex items-center justify-between mb-5">
              <p className="font-semibold font-sora text-base text-[var(--text)]">Buat Room Baru</p>
              <button onClick={handleClose} className="text-[var(--text3)] hover:text-[var(--text)] transition-colors">
                <FiX size={20} />
              </button>
            </div>

            <label className="text-xs text-[var(--text3)] mb-1.5 block">Nama room *</label>
            <input
              className="neo-input w-full rounded-xl px-4 py-3 text-sm outline-none mb-4 bg-[var(--surface2)] text-[var(--text)] placeholder:text-[var(--text3)] focus:border-[var(--accent)] transition-colors"
              placeholder="Contoh: Tugas, Catatan, Random..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />

            <label className="text-xs text-[var(--text3)] mb-1.5 block">
              Deskripsi <span className="text-[var(--text3)]">(opsional)</span>
            </label>
            <input
              className="neo-input w-full rounded-xl px-4 py-3 text-sm outline-none mb-5 bg-[var(--surface2)] text-[var(--text)] placeholder:text-[var(--text3)] focus:border-[var(--accent)] transition-colors"
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
                  className="neo-button w-10 h-10 rounded-lg flex items-center justify-center text-xl transition-colors"
                  style={{
                    background: icon === e ? "var(--accent)" : "var(--surface2)",
                    color: icon === e ? "var(--accent-ink)" : "var(--text)",
                  }}
                >
                  {e}
                </button>
              ))}
            </div>

            <button
              onClick={handleCreate}
              disabled={!name.trim() || loading}
              className="neo-button w-full py-3 rounded-xl font-semibold text-sm font-sora transition-opacity bg-[var(--accent)] text-[var(--accent-ink)]"
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