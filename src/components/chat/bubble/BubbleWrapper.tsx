"use client"

import { useState, useRef, useCallback } from "react"
import ContextMenu from "@/components/chat/modals/ContextMenu"
import RemindModal from "@/components/chat/modals/RemindModal"
import DeleteMessageModal from "@/components/chat/modals/DeleteMessageModal"
import EditMessageModal from "@/components/chat/modals/EditMessageModal"
import MessageBubble from "./MessageBubble"
import ChecklistBubble from "./ChecklistBubble"
import { MessageType } from "@prisma/client"
import type { ChatMessage } from "@/types/chat"

type Props = {
  message: ChatMessage
  onUpdate: (id: string, patch: Partial<ChatMessage>) => void
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
  const [showDelete, setShowDelete] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
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

  const handleToggleDone = useCallback(async () => {
    const nextIsDone = !message.isDone
    if (message.type === MessageType.CHECKLIST) {
      const nextItems = message.checklistItems.map((item) => ({
        ...item,
        isDone: nextIsDone,
      }))
      onUpdate(message.id, { isDone: nextIsDone, checklistItems: nextItems })

      const res = await fetch(`/api/messages/${message.id}/checklist`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: message.text,
          items: nextItems.map((item) => ({
            text: item.text,
            isDone: item.isDone,
          })),
        }),
      })

      if (res.ok) {
        const updated: ChatMessage = await res.json()
        onUpdate(message.id, updated)
      }
      return
    }

    onUpdate(message.id, { isDone: nextIsDone })
    await fetch(`/api/messages/${message.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDone: nextIsDone }),
    })

  }, [message, onUpdate])

  const handleTogglePin = useCallback(() => {
    onUpdate(message.id, { isPinned: !message.isPinned })
    fetch(`/api/messages/${message.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPinned: !message.isPinned }),
    })
  }, [message.id, message.isPinned, onUpdate])

  const handleDelete = useCallback(async () => {
    const res = await fetch(`/api/messages/${message.id}`, { method: "DELETE" })
    if (res.ok) {
      onRemove(message.id)
    }
  }, [message.id, onRemove])

  const handleEdit = useCallback(async (text: string) => {
    const res = await fetch(`/api/messages/${message.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    })
    if (res.ok) {
      const updated: ChatMessage = await res.json()
      onUpdate(message.id, {
        text: updated.text,
        editedAt: updated.editedAt ? new Date(updated.editedAt) : null,
      })
    }
  }, [message.id, onUpdate])

  const handleRemindSave = useCallback((remindAt: Date) => {
    onUpdate(message.id, { remindAt, isRemindDone: false })
    fetch(`/api/messages/${message.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        remindAt: remindAt.toISOString(),
        isRemindDone: false,
      }),
    })
  }, [message.id, onUpdate])

  const handleMarkReminded = useCallback(() => {
    onUpdate(message.id, { isRemindDone: true })
    fetch(`/api/messages/${message.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isRemindDone: true }),
    })
  }, [message.id, onUpdate])

  return (
    <>
      <div
        onContextMenu={handleContextMenu}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchEnd}
        className="select-none"
      >
        {message.type === MessageType.CHECKLIST ? (
          <ChecklistBubble message={message} onUpdate={onUpdate} />
        ) : (
          <MessageBubble
            message={message}
            isNew={isNew}
            searchQuery={searchQuery}
          />
        )}
      </div>

      {menuPos && (
        <ContextMenu
          x={menuPos.x}
          y={menuPos.y}
          isChecklist={message.type === MessageType.CHECKLIST}
          isDone={message.isDone}
          isPinned={message.isPinned}
          hasActiveReminder={Boolean(message.remindAt && !message.isRemindDone)}
          onCopy={handleCopy}
          onEdit={() => { setMenuPos(null); setShowEdit(true) }}
          onToggleDone={handleToggleDone}
          onRemind={() => { setMenuPos(null); setShowRemind(true) }}
          onMarkReminded={handleMarkReminded}
          onTogglePin={handleTogglePin}
          onDelete={() => { setMenuPos(null); setShowDelete(true) }}
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

      {showEdit && message.type === MessageType.TEXT && (
        <EditMessageModal
          initialText={message.text}
          onSave={handleEdit}
          onClose={() => setShowEdit(false)}
        />
      )}

      {showDelete && (
        <DeleteMessageModal
          label={message.type === MessageType.CHECKLIST ? "checklist" : "pesan"}
          onConfirm={handleDelete}
          onClose={() => setShowDelete(false)}
        />
      )}
    </>
  )
}