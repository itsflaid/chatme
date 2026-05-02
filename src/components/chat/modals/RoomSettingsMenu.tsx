"use client"

import { FiEdit2, FiBookmark, FiTrash2 } from "react-icons/fi"

type Props = {
  onEdit: () => void
  onPinned: () => void
  onDelete: () => void
  onClose: () => void
}

export default function RoomSettingsMenu({ onEdit, onPinned, onDelete, onClose }: Props) {
  const items = [
    { icon: <FiEdit2 size={15} />, label: "Edit Room", onClick: onEdit, danger: false },
    { icon: <FiBookmark size={15} />, label: "Pesan Dipin", onClick: onPinned, danger: false },
    { icon: <FiTrash2 size={15} />, label: "Hapus Room", onClick: onDelete, danger: true },
  ]

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />

      <div
        className="absolute right-4 top-14 z-50 rounded-2xl overflow-hidden border min-w-[180px]"
        style={{
          background: "var(--surface2)",
          borderColor: "var(--border2)",
          boxShadow: "0 8px 32px #00000050",
          animation: "menuPop 0.15s ease",
        }}
      >
        {items.map((item, i) => (
          <button
            key={i}
            onClick={() => { item.onClick(); onClose() }}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-left border-b last:border-b-0 transition-colors"
            style={{
              borderColor: "var(--border)",
              color: item.danger ? "#fca5a5" : "var(--text)",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "var(--surface3)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </div>
    </>
  )
}