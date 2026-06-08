"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { signOut } from "next-auth/react"
import { FiLogOut, FiUser } from "react-icons/fi"

type Props = {
  userName: string | null | undefined
}

export default function Topbar({ userName }: Props) {
  const initial = userName?.charAt(0).toUpperCase() ?? "?"
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener("pointerdown", handlePointerDown)
    return () => document.removeEventListener("pointerdown", handlePointerDown)
  }, [])

  return (
    <div
      className="m-3 mb-2 flex items-center justify-between rounded-xl bg-[var(--surface)] px-4 py-3 neo-panel"
    >
      <h1 className="text-lg font-bold font-sora text-[var(--text)]">
        Chat<span className="text-[var(--coral)]">me</span>
      </h1>
      <div ref={menuRef} className="relative flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen(value => !value)}
          aria-label="Buka menu profil"
          aria-expanded={open}
          className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs font-sora bg-[var(--paper)] text-[var(--accent-ink)] neo-button"
        >
          {initial}
        </button>

        {open && (
          <div className="neo-panel absolute right-0 top-12 z-50 w-48 overflow-hidden rounded-xl bg-[var(--surface)]">
            <div className="border-b-2 border-[var(--neo-line)] px-4 py-3">
              <p className="truncate text-sm font-bold font-sora text-[var(--text)]">
                {userName || "Pengguna Chatme"}
              </p>
              <p className="mt-0.5 text-[11px] text-[var(--text3)]">Akun pribadi</p>
            </div>

            <Link
              href="/profile"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-3 border-b-2 border-[var(--neo-line)] px-4 py-3 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface3)]"
            >
              <FiUser size={16} />
              My Profile
            </Link>

            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-[var(--coral)] transition hover:bg-[var(--surface3)]"
            >
              <FiLogOut size={16} />
              Logout
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
