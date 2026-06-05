"use client"

import { useEffect, useState } from "react"
import { FiMoon, FiSun } from "react-icons/fi"

type Theme = "dark" | "light"

type Props = {
  className?: string
}

function getInitialTheme(): Theme {
  if (typeof document === "undefined") return "dark"
  return document.documentElement.dataset.theme === "light" ? "light" : "dark"
}

export default function ThemeToggle({ className = "" }: Props) {
  const [theme, setTheme] = useState<Theme>("dark")

  useEffect(() => {
    setTheme(getInitialTheme())
  }, [])

  function toggleTheme() {
    const nextTheme: Theme = theme === "dark" ? "light" : "dark"
    document.documentElement.dataset.theme = nextTheme
    localStorage.setItem("chatme-theme", nextTheme)
    setTheme(nextTheme)
  }

  const isLight = theme === "light"

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isLight ? "Aktifkan dark mode" : "Aktifkan light mode"}
      title={isLight ? "Dark mode" : "Light mode"}
      className={`h-8 w-8 flex-shrink-0 rounded-full border border-[var(--border2)] bg-[var(--surface2)] text-[var(--text2)] transition hover:border-[var(--accent)] hover:text-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-[var(--bg)] ${className}`}
    >
      <span className="flex h-full w-full items-center justify-center">
        {isLight ? <FiMoon size={15} /> : <FiSun size={15} />}
      </span>
    </button>
  )
}
