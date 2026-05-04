"use client"

import { useState, useRef, useCallback } from "react"
import ContextMenu from "@/components/chat/modals/ContextMenu"
import RemindModal from "@/components/chat/modals/RemindModal"
import MessageBubble from "./MessageBubble"
import { Message } from "@prisma/client"

type Props = {
  message: Message
  onUpdate: (id: string, patch: Partial<Message>) => void
  onRemove: (id: string) => void
}

export default function BubbleWrapper({ message, onUpdate, onRemove }: Props) {
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null)
  const [showRemind, setShowRemind] = useState(false)
  const touchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  const handleToggleDone = useCallback(() => {
    // optimistic
    onUpdate(message.id, { isDone: !message.isDone })
    // sync background
    fetch(`/api/messages/${message.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDone: !message.isDone }),
    })
  }, [message.id, message.isDone, onUpdate])

  const handleTogglePin = useCallback(() => {
    // optimistic
    onUpdate(message.id, { isPinned: !message.isPinned })
    // sync background
    fetch(`/api/messages/${message.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPinned: !message.isPinned }),
    })
  }, [message.id, message.isPinned, onUpdate])

  const handleDelete = useCallback(() => {
    // optimistic
    onRemove(message.id)
    // sync background
    fetch(`/api/messages/${message.id}`, { method: "DELETE" })
  }, [message.id, onRemove])

  const handleRemindSave = useCallback((remindAt: Date) => {
    // optimistic
    onUpdate(message.id, { remindAt })
    // sync background
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
        <MessageBubble message={message} />
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