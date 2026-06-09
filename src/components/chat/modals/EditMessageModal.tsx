"use client"

import { useState } from "react"
import { FiEdit2, FiX } from "react-icons/fi"

type Props = {
  initialText: string
  onSave: (text: string) => Promise<void>
  onClose: () => void
}

export default function EditMessageModal({ initialText, onSave, onClose }: Props) {
  const [text, setText] = useState(initialText)
  const [loading, setLoading] = useState(false)

  async function handleSave() {
    const trimmed = text.trim()
    if (!trimmed || trimmed === initialText) return
    setLoading(true)
    await onSave(trimmed)
    setLoading(false)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#10201999] p-3 sm:items-center"
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="neo-panel w-full max-w-md rounded-2xl bg-[var(--surface)] p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FiEdit2 size={16} className="text-[var(--accent)]" />
            <h2 className="font-sora text-base font-bold">Edit Pesan</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="neo-button flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--surface2)]"
            aria-label="Tutup"
          >
            <FiX size={16} />
          </button>
        </div>

        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if ((event.ctrlKey || event.metaKey) && event.key === "Enter") handleSave()
          }}
          rows={5}
          autoFocus
          maxLength={2000}
          className="neo-input w-full resize-none rounded-xl bg-[var(--surface2)] px-4 py-3 text-sm outline-none"
        />

        <button
          type="button"
          onClick={handleSave}
          disabled={!text.trim() || text.trim() === initialText || loading}
          className="neo-button mt-4 w-full rounded-xl bg-[var(--accent)] py-3 text-sm font-bold text-[var(--accent-ink)] disabled:opacity-45"
        >
          {loading ? "Menyimpan..." : "Simpan Perubahan"}
        </button>
      </div>
    </div>
  )
}
