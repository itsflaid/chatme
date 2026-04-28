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

      {/* sidebar — hidden di mobile kalau di dalam room */}
      <div
        className={`relative flex flex-col flex-shrink-0 md:border-r border-[var(--border)] md:w-80 md:flex w-full ${isInRoom ? "hidden md:flex" : "flex"}`}
      >
        {sidebar}
      </div>

      {/* konten kanan — hidden di mobile kalau di room list */}
      <div
        className={`flex-1 flex-col overflow-hidden md:flex ${isInRoom ? "flex" : "hidden md:flex"}`}
      >
        {children}
      </div>

    </div>
  )
}