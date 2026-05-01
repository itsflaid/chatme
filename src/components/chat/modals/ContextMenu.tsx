// Context menu yang muncul saat long-press bubble
// Posisinya absolute mengikuti posisi klik/touch
// "use client" karena ada event handler

"use client"

import { FiCopy, FiCheck, FiBell, FiBookmark, FiTrash2 } from "react-icons/fi"

type Props = {
  x: number
  y: number
  isDone: boolean
  isPinned: boolean
  onCopy: () => void
  onToggleDone: () => void
  onRemind: () => void
  onTogglePin: () => void
  onDelete: () => void
  onClose: () => void
}

export default function ContextMenu({
  x, y, isDone, isPinned,
  onCopy, onToggleDone, onRemind, onTogglePin, onDelete, onClose
}: Props) {

  // pastiin menu tidak keluar dari viewport
  const safeY = Math.min(y, window.innerHeight - 280)
  const safeX = Math.max(8, Math.min(x - 100, window.innerWidth - 210))

  const items = [
    {
      icon: <FiCopy size={15} />,
      label: "Salin",
      onClick: onCopy,
      danger: false,
    },
    {
      icon: <FiCheck size={15} />,
      label: isDone ? "Tandai Belum Selesai" : "Tandai Selesai",
      onClick: onToggleDone,
      danger: false,
    },
    {
      icon: <FiBell size={15} />,
      label: "Ingatkan",
      onClick: onRemind,
      danger: false,
    },
    {
      icon: <FiBookmark size={15} />,
      label: isPinned ? "Unpin" : "Pin Pesan",
      onClick: onTogglePin,
      danger: false,
    },
    {
      icon: <FiTrash2 size={15} />,
      label: "Hapus",
      onClick: onDelete,
      danger: true,
    },
  ]

  return (
    <>
      {/* overlay untuk close saat klik luar */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />

      <div
        className="fixed z-50 rounded-2xl overflow-hidden border min-w-[200px] bg-[var(--surface2)] border-[var(--border2)]"
        style={{
          top: safeY,
          left: safeX,
          boxShadow: "0 8px 32px #00000050",
          animation: "menuPop 0.15s ease",
        }}
      >
        {items.map((item, i) => (
          <button
            key={i}
            onClick={() => { item.onClick(); onClose() }}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-left transition-colors border-b last:border-b-0 border-[var(--border)]"
            style={{
              color: item.danger ? "#fca5a5" : "var(--text)",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--surface3)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </div>
    </>
  )
}