"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { FiPlus, FiSend } from "react-icons/fi"
import { MessageType } from "@prisma/client"
import ChecklistComposer from "./modals/ChecklistComposer"
import type { ChatMessage } from "@/types/chat"

type Props = {
  roomId: string
  userId: string
  onMessageAdd: (message: ChatMessage) => void
  onMessageReplace: (tempId: string, realMessage: ChatMessage) => void
  onMessageRemove: (id: string) => void
  onCheckReminders: () => void
}

export default function ChatInput({
  roomId,
  userId,
  onMessageAdd,
  onMessageReplace,
  onMessageRemove,
  onCheckReminders,
}: Props) {
  const [text, setText] = useState("")
  const [showChecklist, setShowChecklist] = useState(false)
  const [checklistLoading, setChecklistLoading] = useState(false)
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

    const tempMessage: ChatMessage = {
      id: tempId,
      text: trimmed,
      type: MessageType.TEXT,
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
      checklistItems: [],
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
    } else {
      onMessageRemove(tempId)
    }
  }

  async function handleChecklistSubmit(title: string, items: string[]) {
    const tempId = `temp-${Date.now()}`
    const now = new Date()
    const tempMessage: ChatMessage = {
      id: tempId,
      text: title,
      type: MessageType.CHECKLIST,
      isDone: false,
      isPinned: false,
      isBot: false,
      remindAt: null,
      remindSnoozeAt: null,
      isRemindDone: false,
      sourceMessageId: null,
      roomId,
      userId,
      createdAt: now,
      updatedAt: now,
      checklistItems: items.map((item, position) => ({
        id: `${tempId}-${position}`,
        text: item,
        isDone: false,
        position,
        messageId: tempId,
        createdAt: now,
        updatedAt: now,
      })),
    }

    onMessageAdd(tempMessage)
    setChecklistLoading(true)

    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomId,
        text: title,
        type: MessageType.CHECKLIST,
        items,
      }),
    })

    if (res.ok) {
      const realMessage: ChatMessage = await res.json()
      onMessageReplace(tempId, realMessage)
      setShowChecklist(false)
      setTimeout(() => router.refresh(), 500)
    } else {
      onMessageRemove(tempId)
    }

    setChecklistLoading(false)
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex items-end gap-3 px-4 py-3 sm:px-6">
      <button
        type="button"
        onClick={() => setShowChecklist(true)}
        className="neo-button flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--sage)] text-[var(--text)]"
        aria-label="Buat checklist"
        title="Buat checklist"
      >
        <FiPlus size={18} />
      </button>
      <textarea
        ref={textareaRef}
        className="neo-input flex-1 max-h-[110px] rounded-xl bg-[var(--surface2)] px-4 py-2.5 text-sm leading-relaxed text-[var(--text)] outline-none resize-none"
        placeholder="Ketik sesuatu..."
        rows={1}
        value={text}
        onChange={(e) => { setText(e.target.value); autoResize() }}
        onKeyDown={handleKey}
      />
      <button
        onClick={handleSend}
        disabled={!text.trim()}
        className="neo-button w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-opacity bg-[var(--accent)] text-[var(--accent-ink)]"
        style={{ opacity: !text.trim() ? 0.5 : 1 }}
      >
        <FiSend size={16} />
      </button>

      {showChecklist && (
        <ChecklistComposer
          loading={checklistLoading}
          onClose={() => !checklistLoading && setShowChecklist(false)}
          onSubmit={handleChecklistSubmit}
        />
      )}
    </div>
  )
}
