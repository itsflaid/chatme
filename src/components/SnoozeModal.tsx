"use client"

import { FiX, FiClock } from "react-icons/fi"

type Props = {
  onSelect: (minutes: number) => void
  onClose: () => void
}

const OPTIONS = [
  { label: "15 Menit", minutes: 15 },
  { label: "1 Jam", minutes: 60 },
  { label: "Besok", minutes: 60 * 24 },
]

export default function SnoozeModal({ onSelect, onClose }: Props) {
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
        <div className="w-9 h-1 rounded-full mx-auto mb-5 bg-[var(--border2)]" />

        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <FiClock size={16} className="text-[var(--accent)]" />
            <p className="font-semibold font-sora text-sm text-[var(--text)]">
              Tunda Pengingat
            </p>
          </div>
          <button onClick={onClose} className="text-[var(--text3)]">
            <FiX size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {OPTIONS.map((opt) => (
            <button
              key={opt.minutes}
              onClick={() => onSelect(opt.minutes)}
              className="w-full py-3.5 rounded-xl text-sm font-semibold font-sora text-left px-4 border transition-colors hover:bg-[var(--surface2)]"
              style={{
                background: "var(--surface2)",
                borderColor: "var(--border2)",
                color: "var(--text)",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}