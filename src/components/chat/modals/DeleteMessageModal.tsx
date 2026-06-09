"use client"

import { useState } from "react"
import { FiAlertTriangle, FiX } from "react-icons/fi"

type Props = {
  label: "pesan" | "checklist"
  onConfirm: () => Promise<void>
  onClose: () => void
}

export default function DeleteMessageModal({ label, onConfirm, onClose }: Props) {
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)
    await onConfirm()
    setLoading(false)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#10201999] p-3 sm:items-center"
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="neo-panel w-full max-w-sm rounded-2xl bg-[var(--surface)] p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FiAlertTriangle size={17} className="text-[var(--coral)]" />
            <h2 className="font-sora text-base font-bold text-[var(--text)]">
              Hapus {label}
            </h2>
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

        <p className="mb-6 text-sm leading-6 text-[var(--text2)]">
          {label === "checklist"
            ? "Checklist beserta seluruh itemnya akan dihapus permanen."
            : "Pesan ini akan dihapus permanen dan tidak bisa dikembalikan."}
        </p>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="neo-button flex-1 rounded-xl bg-[var(--surface2)] py-3 text-sm font-bold"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="neo-button flex-1 rounded-xl bg-[var(--coral)] py-3 text-sm font-bold text-[var(--text)] disabled:opacity-50"
          >
            {loading ? "Menghapus..." : "Hapus"}
          </button>
        </div>
      </div>
    </div>
  )
}
