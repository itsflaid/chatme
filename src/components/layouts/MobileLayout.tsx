"use client"

import { usePathname } from "next/navigation"
import { motion } from "framer-motion"

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

        <motion.div
          className="absolute inset-0 min-h-0 flex flex-col"
          animate={{ x: isContentPage ? "-100%" : "0%" }}
          transition={slideTransition}
        >
          {sidebar}
        </motion.div>

        <motion.div
          className="absolute inset-0 min-h-0 flex flex-col"
          animate={{ x: isContentPage ? "0%" : "100%" }}
          transition={slideTransition}
        >
          {children}
        </motion.div>

      </div>

    </div>
  )
}
