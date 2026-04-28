"use client"

import { useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import ContextMenu from "./ContextMenu"
import RemindModal from "./RemindModal"
import MessageBubble from "./MessageBubble"
import { Message } from "@prisma/client"

type Props = {
  message: Message
}

export default function BubbleWrapper({ message }: Props) {
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null)
  const [showRemind, setShowRemind] = useState(false)
  const touchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const router = useRouter()

  function openMenu(x: number, y: number) {
    setMenuPos({ x, y })
  }

  function handleTouchStart(e: React.TouchEvent) {
    const touch = e.touches[0]
    touchTimer.current = setTimeout(() => {
      openMenu(touch.clientX, touch.clientY)
    }, 500)
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
    await fetch(`/api/messages/${message.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDone: !message.isDone }),
    })
    router.refresh()
  }, [message.id, message.isDone, router])

  const handleTogglePin = useCallback(async () => {
    await fetch(`/api/messages/${message.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPinned: !message.isPinned }),
    })
    router.refresh()
  }, [message.id, message.isPinned, router])

  const handleDelete = useCallback(async () => {
    await fetch(`/api/messages/${message.id}`, {
      method: "DELETE",
    })
    router.refresh()
  }, [message.id, router])

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
        />
      )}
    </>
  )
}