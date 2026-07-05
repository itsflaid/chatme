"use client"

import { FiEdit2, FiBookmark, FiTrash2 } from "react-icons/fi"
import { ModalPortal } from "@/components/ui/ModalPortal"

type Props = {
  x: number
  y: number
  onEdit: () => void
  onPinned: () => void
  onDelete: () => void
  onClose: () => void
}

export default function RoomSettingsMenu({ x, y, onEdit, onPinned, onDelete, onClose }: Props) {
  const items = [
    { icon: <FiEdit2 size={15} />, label: "Edit Room", onClick: onEdit, danger: false },
    { icon: <FiBookmark size={15} />, label: "Pesan Dipin", onClick: onPinned, danger: false },
    { icon: <FiTrash2 size={15} />, label: "Hapus Room", onClick: onDelete, danger: true },
  ]

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-40" onClick={onClose}>
        <div
          className="neo-panel fixed z-50 min-w-[180px] overflow-hidden rounded-xl"
          style={{
            top: y,
            right: typeof window !== "undefined" ? window.innerWidth - x : 0,
            background: "var(--surface2)",
            animation: "menuPop 0.15s ease",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {items.map((item, i) => (
            <button
              key={i}
              onClick={() => { item.onClick(); onClose() }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-left border-b-2 last:border-b-0 transition-colors"
              style={{
                borderColor: "var(--neo-line)",
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
      </div>
    </ModalPortal>
  )
}
