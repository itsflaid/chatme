"use client"

import { FiInfo, FiEdit2, FiTrash2, FiBookmark } from "react-icons/fi"
import { ModalPortal } from "@/components/ui/ModalPortal"

type Props = {
  x: number
  y: number
  isPinned: boolean
  onTogglePin: () => void
  onInfo: () => void
  onEdit: () => void
  onDelete: () => void
  onClose: () => void
}

export default function RoomItemMenu({ x, y, isPinned, onTogglePin, onInfo, onEdit, onDelete, onClose }: Props) {
  // pastiin menu tidak keluar dari viewport
  const safeY = Math.min(y, window.innerHeight - 340)
  const safeX = Math.max(8, Math.min(x - 100, window.innerWidth - 210))

  const items = [
    { icon: <FiBookmark size={15} />, label: isPinned ? "Unpin Room" : "Pin Room", onClick: onTogglePin, danger: false },
    { icon: <FiInfo size={15} />, label: "Info Room", onClick: onInfo, danger: false },
    { icon: <FiEdit2 size={15} />, label: "Edit Room", onClick: onEdit, danger: false },
    { icon: <FiTrash2 size={15} />, label: "Hapus Room", onClick: onDelete, danger: true },
  ]

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      >
        <div
          className="neo-panel fixed z-50 min-w-[200px] overflow-hidden rounded-xl bg-[var(--surface2)]"
          style={{
            top: safeY,
            left: safeX,
            animation: "menuPop 0.15s ease",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {items.map((item, i) => (
            <button
              key={i}
              onClick={() => { item.onClick(); onClose() }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-left transition-colors border-b-2 last:border-b-0 border-[var(--neo-line)]"
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
      </div>
    </ModalPortal>
  )
}
