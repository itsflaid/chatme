"use client"

import { FiWifiOff } from "react-icons/fi"

export default function OfflinePage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="neo-card flex h-16 w-16 -rotate-3 items-center justify-center rounded-full bg-[var(--surface)]">
        <FiWifiOff size={26} className="text-[var(--accent)]" />
      </div>
      <div>
        <p className="text-lg font-semibold text-[var(--text)]">Kamu lagi offline</p>
        <p className="mt-1 max-w-[240px] text-sm text-[var(--text2)]">
          Room yang udah pernah dibuka tetap bisa diakses. Halaman ini belum sempat ke-simpen.
        </p>
      </div>
      <button
        onClick={() => window.location.reload()}
        className="neo-button mt-2 rotate-1 rounded-xl bg-[var(--accent)] px-5 py-2 text-sm font-bold text-[var(--accent-ink)]"
      >
        Coba lagi
      </button>
    </div>
  )
}
