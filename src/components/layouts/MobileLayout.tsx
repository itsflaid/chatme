"use client"

import { usePathname } from "next/navigation"
import { useReducer, useRef } from "react"

type Props = {
  sidebar: React.ReactNode
  children: React.ReactNode
}

type SlideState = {
  displayedIsContentPage: boolean
  phase: "idle" | "sliding"
  frozenChildren: React.ReactNode | null
  frozenSidebar: React.ReactNode | null
}

type SlideAction =
  | { type: "freeze"; children: React.ReactNode; sidebar: React.ReactNode; isContentPage: boolean }
  | { type: "unfreeze" }

function slideReducer(state: SlideState, action: SlideAction): SlideState {
  switch (action.type) {
    case "freeze":
      return {
        displayedIsContentPage: action.isContentPage,
        phase: "sliding",
        frozenChildren: action.children,
        frozenSidebar: action.sidebar,
      }
    case "unfreeze":
      return { ...state, phase: "idle" }
  }
}

export default function MobileLayout({ sidebar, children }: Props) {
  const pathname = usePathname()
  const isContentPage = pathname.startsWith("/room/") || pathname === "/profile"

  const [slideState, dispatch] = useReducer(slideReducer, {
    displayedIsContentPage: isContentPage,
    phase: "idle",
    frozenChildren: null,
    frozenSidebar: null,
  })

  const sidebarRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const justSnappedRef = useRef(false)

  if (isContentPage !== slideState.displayedIsContentPage) {
    if (slideState.phase === "sliding") {
      const sidebarEl = sidebarRef.current
      const contentEl = contentRef.current
      if (sidebarEl && contentEl) {
        sidebarEl.style.transition = "none"
        contentEl.style.transition = "none"
        void sidebarEl.offsetWidth
        justSnappedRef.current = true
        setTimeout(() => {
          justSnappedRef.current = false
        }, 0)
      }
    }

    dispatch({
      type: "freeze",
      children,
      sidebar,
      isContentPage,
    })
  }

  function handleTransitionEnd(e: React.TransitionEvent<HTMLDivElement>) {
    if (e.target !== contentRef.current) return
    if (e.propertyName !== "transform") return
    if (justSnappedRef.current) {
      justSnappedRef.current = false
      return
    }
    dispatch({ type: "unfreeze" })
  }

  const renderedChildren = slideState.phase === "sliding" ? slideState.frozenChildren : children
  const renderedSidebar = slideState.phase === "sliding" ? slideState.frozenSidebar : sidebar

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
          ref={sidebarRef}
          className="absolute inset-0 min-h-0 flex flex-col transition-transform"
          style={{
            transform: slideState.displayedIsContentPage ? "translateX(-100%)" : "translateX(0)",
            transitionDuration: "280ms",
            transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
            willChange: "transform",
          }}
        >
          {renderedSidebar}
        </div>

        <div
          ref={contentRef}
          onTransitionEnd={handleTransitionEnd}
          className="absolute inset-0 min-h-0 flex flex-col transition-transform"
          style={{
            transform: slideState.displayedIsContentPage ? "translateX(0)" : "translateX(100%)",
            transitionDuration: "280ms",
            transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
            willChange: "transform",
          }}
        >
          {renderedChildren}
        </div>

      </div>

    </div>
  )
}
