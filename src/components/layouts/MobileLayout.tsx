"use client"

import { usePathname } from "next/navigation"

type Props = {
  sidebar: React.ReactNode
  children: React.ReactNode
}

export default function MobileLayout({ sidebar, children }: Props) {
  const pathname = usePathname()
  const isInRoom = pathname.startsWith("/room/")

  return (
    <div className="h-screen flex overflow-hidden bg-[var(--bg)]">

      {/* ── DESKTOP — selalu tampil dua kolom ── */}
      <div className="hidden md:flex w-80 flex-col flex-shrink-0 border-r border-[var(--border)]">
        {sidebar}
      </div>
      <div className="hidden md:flex flex-1 flex-col overflow-hidden">
        {children}
      </div>

      {/* ── MOBILE — bergantian dengan animasi slide ── */}
      <div className="flex md:hidden w-full h-full relative overflow-hidden">

        {/* sidebar mobile */}
        <div
          className="absolute inset-0 flex flex-col transition-transform duration-300 ease-in-out"
          style={{ transform: isInRoom ? "translateX(-100%)" : "translateX(0)" }}
        >
          {sidebar}
        </div>

        {/* chat mobile */}
        <div
          className="absolute inset-0 flex flex-col transition-transform duration-300 ease-in-out"
          style={{ transform: isInRoom ? "translateX(0)" : "translateX(100%)" }}
        >
          {children}
        </div>

      </div>

    </div>
  )
}