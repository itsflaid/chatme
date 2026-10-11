"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { usePathname } from "next/navigation"
import { SIDEBAR_COLLAPSED, SIDEBAR_COOKIE, SIDEBAR_EXPANDED } from "@/lib/sidebarCookie"

type SidebarCollapseValue = {
  collapsed: boolean
  canCollapse: boolean
  toggle: () => void
}

const SidebarCollapseContext = createContext<SidebarCollapseValue>({
  collapsed: false,
  canCollapse: false,
  toggle: () => {},
})

export function useSidebarCollapse() {
  return useContext(SidebarCollapseContext)
}

function useSidebarCollapseState(defaultCollapsed: boolean): SidebarCollapseValue {
  const pathname = usePathname()
  const [stored, setStored] = useState(defaultCollapsed)
  const canCollapse = pathname.startsWith("/room/")

  const toggle = useCallback(() => {
    const next = !stored
    setStored(next)
    document.cookie = `${SIDEBAR_COOKIE}=${next ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED}; path=/; max-age=31536000; samesite=lax`
  }, [stored])

  useEffect(() => {
    if (!canCollapse) return

    function handleKeyDown(event: KeyboardEvent) {
      if (!(event.ctrlKey || event.metaKey) || event.key !== "\\") return
      if (!window.matchMedia("(min-width: 768px)").matches) return
      event.preventDefault()
      toggle()
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [canCollapse, toggle])

  return useMemo(
    () => ({ collapsed: stored && canCollapse, canCollapse, toggle }),
    [stored, canCollapse, toggle]
  )
}

type RootProps = {
  defaultCollapsed: boolean
  children: React.ReactNode
}

export function SidebarCollapseRoot({ defaultCollapsed, children }: RootProps) {
  const value = useSidebarCollapseState(defaultCollapsed)

  return <SidebarCollapseContext.Provider value={value}>{children}</SidebarCollapseContext.Provider>
}
