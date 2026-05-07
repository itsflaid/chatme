"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { FiSend } from "react-icons/fi"
import { Message } from "@prisma/client"

type Props = {
  roomId: string
  userId: string
  onMessageAdd: (message: Message) => void
  onMessageReplace: (tempId: string, realMessage: Message) => void
  onCheckReminders: () => void
}

export default function ChatInput({
  roomId,
  userId,
  onMessageAdd,
  onMessageReplace,
  onCheckReminders,
}: Props) {
  const [text, setText] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const router = useRouter()

  function autoResize() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = Math.min(el.scrollHeight, 100) + "px"
  }

  async function handleSend() {
    if (!text.trim()) return
    const trimmed = text.trim()
    const tempId = `temp-${Date.now()}`

    const tempMessage: Message = {
      id: tempId,
      text: trimmed,
      isDone: false,
      isPinned: false,
      isBot: false,
      remindAt: null,
      remindSnoozeAt: null,
      isRemindDone: false,
      sourceMessageId: null,
      roomId,
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    onMessageAdd(tempMessage)
    setText("")
    if (textareaRef.current) textareaRef.current.style.height = "auto"

    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId, text: trimmed }),
    })

    if (res.ok) {
      const realMessage = await res.json()
      onMessageReplace(tempId, realMessage)

      // cek reminder yang triggered
      onCheckReminders()

      // refresh sidebar room list — update preview pesan terakhir
      setTimeout(() => router.refresh(), 500)
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex items-end gap-3 px-4 py-2 sm:py-3">
      <textarea
        ref={textareaRef}
        className="flex-1 max-h-[110px] rounded-2xl px-4 py-2.5 text-sm outline-none resize-none border leading-relaxed bg-[var(--surface2)] border-[var(--border2)] text-[var(--text)]"
        placeholder="Ketik sesuatu..."
        rows={1}
        value={text}
        onChange={(e) => { setText(e.target.value); autoResize() }}
        onKeyDown={handleKey}
      />
      <button
        onClick={handleSend}
        disabled={!text.trim()}
        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-opacity bg-[var(--accent)] text-[var(--bg)]"
        style={{ opacity: !text.trim() ? 0.5 : 1 }}
      >
        <FiSend size={16} />
      </button>
    </div>
  )
}