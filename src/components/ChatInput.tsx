"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { FiSend } from "react-icons/fi"

type Props = {
  roomId: string
}

export default function ChatInput({ roomId }: Props) {
  const [text, setText] = useState("")
  const [loading, setLoading] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const router = useRouter()

  function autoResize() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = Math.min(el.scrollHeight, 100) + "px"
  }

  async function handleSend() {
    if (!text.trim() || loading) return
    setLoading(true)
    await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId, text: text.trim() }),
    })
    setText("")
    if (textareaRef.current) textareaRef.current.style.height = "auto"
    setLoading(false)
    router.refresh()
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div
      className="flex items-end gap-3 px-4 pb-6 "
    >
      <textarea
        ref={textareaRef}
        className="flex-1 rounded-2xl px-4 py-2.5 text-sm outline-none resize-none border leading-relaxed bg-[var(--surface2)] border-[var(--border2)] text-[var(--text)]"
        style={{
          maxHeight: "100px",
        }}
        placeholder="Ketik sesuatu..."
        rows={1}
        value={text}
        onChange={(e) => { setText(e.target.value); autoResize() }}
        onKeyDown={handleKey}
      />
      <button
        onClick={handleSend}
        disabled={!text.trim() || loading}
        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-opacity bg-[var(--accent)] text-[var(--bg)]"
        style={{
          opacity: !text.trim() || loading ? 0.5 : 1,
        }}
      >
        <FiSend size={16} />
      </button>
    </div>
  )
}