"use client"

import { useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import ContextMenu from "@/components/chat/modals/ContextMenu"
import RemindModal from "@/components/chat/modals/RemindModal"
import MessageBubble from "./MessageBubble"
import { Message } from "@prisma/client"

type Props = {
  message: Message
  onUpdate: (id: string, patch: Partial<Message>) => void
  onRemove: (id: string) => void
  isNew?: boolean
  searchQuery?: string
}

export default function BubbleWrapper({
  message,
  onUpdate,
  onRemove,
  isNew = false,
  searchQuery = "",
}: Props) {
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null)
  const [showRemind, setShowRemind] = useState(false)
  const touchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const router = useRouter()

  function openMenu(x: number, y: number) { setMenuPos({ x, y }) }

  function handleTouchStart(e: React.TouchEvent) {
    const touch = e.touches[0]
    touchTimer.current = setTimeout(() => openMenu(touch.clientX, touch.clientY), 500)
  }

  function handleTouchEnd() {
    if (touchTimer.current) clearTimeout(touchTimer.current)
  }

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault()
    openMenu(e.clientX, e.clientY)
  }

  const handleCopy = useCallback(() => {
    navigator.clipboard?.writeText(message.text)
  }, [message.text])

  const handleToggleDone = useCallback(async () => {
    const nextIsDone = !message.isDone
    onUpdate(message.id, { isDone: nextIsDone })

    const res = await fetch(`/api/messages/${message.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDone: nextIsDone }),
    })

    if (res.ok) {
      router.refresh()
    }
  }, [message.id, message.isDone, onUpdate, router])

  const handleTogglePin = useCallback(() => {
    onUpdate(message.id, { isPinned: !message.isPinned })
    fetch(`/api/messages/${message.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPinned: !message.isPinned }),
    })
  }, [message.id, message.isPinned, onUpdate])

  const handleDelete = useCallback(() => {
    onRemove(message.id)
    fetch(`/api/messages/${message.id}`, { method: "DELETE" })
  }, [message.id, onRemove])

  const handleRemindSave = useCallback((remindAt: Date) => {
    onUpdate(message.id, { remindAt })
    fetch(`/api/messages/${message.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ remindAt: remindAt.toISOString() }),
    })
  }, [message.id, onUpdate])

  return (
    <>
      <div
        onContextMenu={handleContextMenu}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchEnd}
      >
        <MessageBubble
          message={message}
          isNew={isNew}
          searchQuery={searchQuery}
        />
      </div>

      {menuPos && (
        <ContextMenu
          x={menuPos.x}
          y={menuPos.y}
          isDone={message.isDone}
          isPinned={message.isPinned}
          onCopy={handleCopy}
          onToggleDone={handleToggleDone}
          onRemind={() => { setMenuPos(null); setShowRemind(true) }}
          onTogglePin={handleTogglePin}
          onDelete={handleDelete}
          onClose={() => setMenuPos(null)}
        />
      )}

      {showRemind && (
        <RemindModal
          messageId={message.id}
          messageText={message.text}
          onClose={() => setShowRemind(false)}
          onSave={handleRemindSave}
        />
      )}
    </>
  )
}
