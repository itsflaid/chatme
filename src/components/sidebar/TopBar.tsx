"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { signOut } from "next-auth/react"
import { FiLogOut, FiUser } from "react-icons/fi"
import SidebarToggleButton from "@/components/layouts/SidebarToggleButton"

type Props = {
  userName: string | null | undefined
  userImage: string | null | undefined
  userEmail: string | null | undefined
}

export default function Topbar({ userName, userImage, userEmail }: Props) {
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
        Chat
        <span className="ml-1 inline-block -rotate-2 rounded-md border-2 border-[var(--neo-line)] bg-[var(--accent)] px-1.5 py-0.5 text-xs text-[var(--accent-ink)] shadow-[2px_2px_0_var(--neo-shadow)]">
          me
        </span>
      </h1>
      <div ref={menuRef} className="relative flex items-center gap-2">
        <SidebarToggleButton />
        <button
          type="button"
          onClick={() => setOpen(value => !value)}
          aria-label="Buka menu profil"
          aria-expanded={open}
          className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs font-sora bg-[var(--paper)] text-[var(--text)] neo-button overflow-hidden"
        >
          {userImage ? (
            <Image
              src={userImage}
              alt={userName ?? ""}
              width={32}
              height={32}
              unoptimized
              className="h-full w-full object-cover"
            />
          ) : (
            initial
          )}
        </button>

        {open && (
          <div className="neo-panel absolute right-0 top-12 z-50 w-48 overflow-hidden rounded-xl bg-[var(--surface)]">
            <div className="flex items-center gap-3 border-b-2 border-[var(--neo-line)] px-4 py-3">
              {userImage ? (
                <Image
                  src={userImage}
                  alt={userName ?? ""}
                  width={36}
                  height={36}
                  unoptimized
                  className="h-9 w-9 rounded-lg object-cover"
                />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--accent)] text-sm font-bold text-[var(--accent-ink)]">
                  {initial}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold font-sora text-[var(--text)]">
                  {userName || "Pengguna Chatme"}
                </p>
                <p className="mt-0.5 truncate text-[11px] text-[var(--text3)]">{userEmail || "Akun pribadi"}</p>
              </div>
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
