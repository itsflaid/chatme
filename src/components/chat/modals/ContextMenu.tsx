// Context menu yang muncul saat long-press bubble
// Posisinya absolute mengikuti posisi klik/touch
// "use client" karena ada event handler

"use client"

import { FiCopy, FiCheck, FiBell, FiBookmark, FiTrash2, FiCheckCircle, FiEdit2 } from "react-icons/fi"
import { ModalPortal } from "@/components/ui/ModalPortal"

type Props = {
  x: number
  y: number
  isChecklist?: boolean
  isDone: boolean
  isPinned: boolean
  hasActiveReminder: boolean
  onCopy: () => void
  onEdit: () => void
  onToggleDone: () => void
  onRemind: () => void
  onMarkReminded: () => void
  onTogglePin: () => void
  onDelete: () => void
  onClose: () => void
}

export default function ContextMenu({
  x, y, isChecklist = false, isDone, isPinned, hasActiveReminder,
  onCopy, onEdit, onToggleDone, onRemind, onMarkReminded, onTogglePin, onDelete, onClose
}: Props) {

  // pastiin menu tidak keluar dari viewport
  const safeY = Math.min(y, window.innerHeight - 280)
  const safeX = Math.max(8, Math.min(x - 100, window.innerWidth - 210))

  const items = [
    ...(!isChecklist ? [{
      icon: <FiCopy size={15} />,
      label: "Salin",
      onClick: onCopy,
      danger: false,
    }] : []),
    ...(!isChecklist && !isDone ? [{
      icon: <FiEdit2 size={15} />,
      label: "Edit Pesan",
      onClick: onEdit,
      danger: false,
    }] : []),
    ...(!isChecklist ? [{
      icon: <FiCheck size={15} />,
      label: isDone ? "Tandai Belum Selesai" : "Tandai Selesai",
      onClick: onToggleDone,
      danger: false,
    }] : []),
    {
      icon: hasActiveReminder ? <FiCheckCircle size={15} /> : <FiBell size={15} />,
      label: hasActiveReminder ? "Tandai sudah diingatkan" : "Ingatkan",
      onClick: hasActiveReminder ? onMarkReminded : onRemind,
      danger: false,
    },
    {
      icon: <FiBookmark size={15} />,
      label: isPinned ? "Unpin" : isChecklist ? "Pin Checklist" : "Pin Pesan",
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
