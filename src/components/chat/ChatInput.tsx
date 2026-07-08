"use client"

import { useState, useRef } from "react"
import { FiPlus, FiSend } from "react-icons/fi"
import { MessageType } from "@prisma/client"
import ChecklistComposer from "./modals/ChecklistComposer"
import { useSendMessage } from "@/hooks/useMessages"

type Props = {
  roomId: string
  onCheckReminders: () => void
}

export default function ChatInput({
  roomId,
  onCheckReminders,
}: Props) {
  const [text, setText] = useState("")
  const [showChecklist, setShowChecklist] = useState(false)
  const [checklistLoading, setChecklistLoading] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const sendMessage = useSendMessage(roomId)

  function autoResize() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = Math.min(el.scrollHeight, 100) + "px"
  }

  async function handleSend() {
    if (!text.trim()) return
    if (sendMessage.isPending) return
    const trimmed = text.trim()
    setText("")
    if (textareaRef.current) textareaRef.current.style.height = "auto"
    sendMessage.mutate(
      { roomId, text: trimmed },
      { onSuccess: () => onCheckReminders() }
    )
  }

  async function handleChecklistSubmit(title: string, items: string[]) {
    setChecklistLoading(true)
    setShowChecklist(false)
    sendMessage.mutate(
      { roomId, text: title, type: MessageType.CHECKLIST, items },
      {
        onSuccess: () => {
          onCheckReminders()
        },
        onSettled: () => {
          setChecklistLoading(false)
        },
      }
    )
  }

  function getListContinuation(value: string, cursorPos: number): string | null {
    const beforeCursor = value.slice(0, cursorPos)
    const currentLineStart = beforeCursor.lastIndexOf("\n") + 1
    const currentLine = beforeCursor.slice(currentLineStart)

    const bulletMatch = currentLine.match(/^(\s*)([-*])\s+(.*)/)
    if (bulletMatch) {
      if (bulletMatch[3].trim() === "") return ""
      return `${bulletMatch[1]}${bulletMatch[2]} `
    }

    const numberedMatch = currentLine.match(/^(\s*)(\d+)\.\s+(.*)/)
    if (numberedMatch) {
      if (numberedMatch[3].trim() === "") return ""
      const nextNumber = parseInt(numberedMatch[2], 10) + 1
      return `${numberedMatch[1]}${nextNumber}. `
    }

    return null
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.nativeEvent as KeyboardEvent).isComposing) return

    if (e.key === "Enter" && e.shiftKey) {
      const el = textareaRef.current
      if (!el) return
      const continuation = getListContinuation(el.value, el.selectionStart)
      if (continuation === null) return

      e.preventDefault()
      const cursorPos = el.selectionStart
      const currentLineStart = el.value.slice(0, cursorPos).lastIndexOf("\n") + 1
      const currentLine = el.value.slice(currentLineStart, cursorPos)

      if (continuation === "") {
        const newValue = el.value.slice(0, currentLineStart) + el.value.slice(cursorPos)
        setText(newValue)
        requestAnimationFrame(() => {
          el.selectionStart = el.selectionEnd = currentLineStart
          autoResize()
        })
        return
      }

      const insertion = "\n" + continuation
      const newValue = el.value.slice(0, cursorPos) + insertion + el.value.slice(cursorPos)
      setText(newValue)
      requestAnimationFrame(() => {
        const newCursorPos = cursorPos + insertion.length
        el.selectionStart = el.selectionEnd = newCursorPos
        autoResize()
      })
      return
    }

    if (e.key === "Enter" && !e.shiftKey && !(e.nativeEvent as KeyboardEvent).isComposing) {
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
