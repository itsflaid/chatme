"use client"

import { useState } from "react"
import { FiList, FiPlus, FiTrash2, FiX } from "react-icons/fi"

type Props = {
  loading: boolean
  onClose: () => void
  onSubmit: (title: string, items: string[]) => void
}

export default function ChecklistComposer({ loading, onClose, onSubmit }: Props) {
  const [title, setTitle] = useState("")
  const [items, setItems] = useState(["", ""])

  function updateItem(index: number, value: string) {
    setItems((current) => current.map((item, itemIndex) => (
      itemIndex === index ? value : item
    )))
  }

  function removeItem(index: number) {
    setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))
  }

  const validItems = items.map((item) => item.trim()).filter(Boolean)
  const canSubmit = title.trim() && validItems.length >= 2 && !loading

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#10201999] p-3 sm:items-center"
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="neo-panel w-full max-w-md rounded-2xl bg-[var(--surface)] p-5">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="neo-button flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--sage)] text-[var(--accent-ink)]">
              <FiList size={19} />
            </div>
            <div>
              <h2 className="font-sora text-base font-bold text-[var(--text)]">Buat Checklist</h2>
              <p className="text-xs text-[var(--text3)]">Minimal dua item</p>
            </div>
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

        <label className="mb-1.5 block text-xs font-bold text-[var(--text2)]">Judul</label>
        <input
          autoFocus
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Contoh: Persiapan deploy"
          maxLength={100}
          className="neo-input mb-5 w-full rounded-xl bg-[var(--surface2)] px-4 py-3 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text3)]"
        />

        <div className="mb-2 flex items-center justify-between">
          <label className="text-xs font-bold text-[var(--text2)]">Daftar item</label>
          <span className="text-[11px] text-[var(--text3)]">{validItems.length}/20</span>
        </div>

        <div className="max-h-72 space-y-3 overflow-y-auto p-1">
          {items.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md border-2 border-[var(--neo-line)] bg-[var(--paper)] text-xs font-black">
                {index + 1}
              </span>
              <input
                value={item}
                onChange={(event) => updateItem(index, event.target.value)}
                placeholder={`Item ${index + 1}`}
                maxLength={120}
                className="neo-input min-w-0 flex-1 rounded-lg bg-[var(--surface2)] px-3 py-2.5 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text3)]"
              />
              <button
                type="button"
                onClick={() => removeItem(index)}
                disabled={items.length <= 2}
                className="neo-button flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--surface2)] text-[var(--coral)] disabled:opacity-35"
                aria-label={`Hapus item ${index + 1}`}
              >
                <FiTrash2 size={15} />
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setItems((current) => [...current, ""])}
          disabled={items.length >= 20}
          className="mt-4 flex items-center gap-2 text-xs font-bold text-[var(--text2)] disabled:opacity-40"
        >
          <FiPlus size={15} />
          Tambah item
        </button>

        <button
          type="button"
          onClick={() => onSubmit(title.trim(), validItems)}
          disabled={!canSubmit}
          className="neo-button mt-6 w-full rounded-xl bg-[var(--accent)] py-3 text-sm font-bold text-[var(--accent-ink)] disabled:opacity-45"
        >
          {loading ? "Mengirim..." : "Kirim Checklist"}
        </button>
      </div>
    </div>
  )
}
