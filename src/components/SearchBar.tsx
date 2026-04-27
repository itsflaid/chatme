"use client"

import { useState } from "react"
import { FiSearch } from "react-icons/fi"

export default function SearchBar() {
  const [query, setQuery] = useState("")

  // nanti query ini akan dipakai untuk filter rooms

  return (
    <div
      className="px-4 py-3 border-b"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      <div
        className="flex items-center gap-2 rounded-xl px-3 py-2 border"
        style={{ background: "var(--surface2)", borderColor: "var(--border)" }}
      >
        <FiSearch size={14} style={{ color: "var(--text3)" }} className="flex-shrink-0" />
        <input
          className="flex-1 bg-transparent text-sm outline-none"
          style={{ color: "var(--text)" }}
          placeholder="Cari pesan atau room..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
    </div>
  )
}