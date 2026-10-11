"use client"

import { usePathname } from "next/navigation"
import { motion } from "framer-motion"
import { useSidebarCollapse } from "./SidebarCollapse"

type Props = {
  sidebar: React.ReactNode
  children: React.ReactNode
}

const slideTransition = {
  duration: 0.28,
  ease: [0.4, 0, 0.2, 1] as const,
}

export default function MobileLayout({ sidebar, children }: Props) {
  const pathname = usePathname()
  const isContentPage = pathname.startsWith("/room/") || pathname === "/profile"
  const { collapsed } = useSidebarCollapse()

  return (
    <div
      className="flex overflow-hidden bg-[var(--bg)]"
      style={{ height: "100dvh" }}
    >

      <div
        className={`hidden md:flex flex-shrink-0 overflow-hidden transition-[width] duration-200 ease-out motion-reduce:transition-none ${
          collapsed ? "w-0" : "w-80"
        }`}
      >
        <div
          className="relative flex w-80 flex-shrink-0 flex-col border-r-2 border-[var(--neo-line)]"
          inert={collapsed}
        >
          {sidebar}
        </div>
      </div>
      <div className="hidden md:flex flex-1 flex-col overflow-hidden">
        {children}
      </div>

      <div className="flex md:hidden w-full  relative overflow-hidden" style={{ height: "100dvh" }}>

        <motion.div
          className="absolute inset-0 min-h-0 flex flex-col"
          initial={false}
          animate={{ x: isContentPage ? "-100%" : "0%" }}
          transition={slideTransition}
        >
          {sidebar}
        </motion.div>

        <motion.div
          className="absolute inset-0 min-h-0 flex flex-col"
          initial={false}
          animate={{ x: isContentPage ? "0%" : "100%" }}
          transition={slideTransition}
        >
          {children}
        </motion.div>

      </div>

    </div>
  )
}
