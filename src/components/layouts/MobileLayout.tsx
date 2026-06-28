"use client"

import { usePathname } from "next/navigation"

type Props = {
  sidebar: React.ReactNode
  children: React.ReactNode
}

export default function MobileLayout({ sidebar, children }: Props) {
  const pathname = usePathname()
  const isContentPage = pathname.startsWith("/room/") || pathname === "/profile"

  return (
    <div
      className="flex overflow-hidden bg-[var(--bg)]"
      style={{ height: "100dvh" }}
    >

      <div className="hidden md:flex w-80 flex-col flex-shrink-0 border-r-2 border-[var(--neo-line)] relative">
        {sidebar}
      </div>
      <div className="hidden md:flex flex-1 flex-col overflow-hidden">
        {children}
      </div>

      <div className="flex md:hidden w-full  relative overflow-hidden" style={{ height: "100dvh" }}>

        <div
          className="absolute inset-0 min-h-0 flex flex-col transition-transform duration-300 ease-in-out"
          style={{ transform: isContentPage ? "translateX(-100%)" : "translateX(0)" }}
        >
          {sidebar}
        </div>

        <div
          className="absolute inset-0 min-h-0 flex flex-col transition-transform duration-300 ease-in-out"
          style={{ transform: isContentPage ? "translateX(0)" : "translateX(100%)" }}
        >
          {children}
        </div>

      </div>

    </div>
  )
}