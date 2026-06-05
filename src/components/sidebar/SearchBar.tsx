"use client"

import { useState } from "react"
import { FiSearch } from "react-icons/fi"

export default function SearchBar() {
  const [query, setQuery] = useState("")

  // nanti query ini akan dipakai untuk filter rooms

  return (
    <div className="px-3 py-3">
      <div
        className="neo-input flex items-center gap-2 rounded-xl bg-[var(--surface2)] px-3 py-2"
      >
        <FiSearch size={14}  className="flex-shrink-0 text-[var(--text3)]" />
        <input
          className="flex-1 bg-transparent text-sm outline-none text-[var(--text)]"
          placeholder="Cari pesan atau room..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
    </div>
  )
}
