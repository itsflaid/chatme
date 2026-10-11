"use client"

import { FiSidebar } from "react-icons/fi"
import { useSidebarCollapse } from "./SidebarCollapse"

type Props = {
  className?: string
}

export default function SidebarToggleButton({ className = "" }: Props) {
  const { collapsed, canCollapse, toggle } = useSidebarCollapse()

  if (!canCollapse) return null

  const label = collapsed ? "Buka daftar room" : "Tutup daftar room"

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      aria-expanded={!collapsed}
      title={`${label} (Ctrl+\\)`}
      className={`neo-button hidden h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--paper)] text-[var(--text)] md:flex ${className}`}
    >
      <FiSidebar size={16} />
    </button>
  )
}
