"use client"

import { useState, memo } from "react"
import { FiCheck, FiEdit2, FiList, FiPlus, FiTrash2, FiX } from "react-icons/fi"
import { trpc } from "@/lib/trpc"
import type { ChatMessage } from "@/types/chat"

type Props = {
  message: ChatMessage
  onUpdate: (id: string, patch: Partial<ChatMessage>) => void
}

const ChecklistBubble = memo(function ChecklistBubble({ message, onUpdate }: Props) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState(message.text)
  const [draftItems, setDraftItems] = useState(
    message.checklistItems.map((item) => ({ text: item.text, isDone: item.isDone }))
  )

  const utils = trpc.useUtils()

  const completed = message.checklistItems.filter((item) => item.isDone).length
  const total = message.checklistItems.length
  const progress = total ? Math.round((completed / total) * 100) : 0
  const isPending = message.id.startsWith("temp-")

  async function toggleItem(itemId: string, isDone: boolean) {
    if (isPending) return
    const nextItems = message.checklistItems.map((item) => (
      item.id === itemId ? { ...item, isDone } : item
    ))
    const messageIsDone = nextItems.every((item) => item.isDone)
    onUpdate(message.id, { checklistItems: nextItems, isDone: messageIsDone })

    try {
      await utils.client.checklistItem.toggle.mutate({ id: itemId, isDone })
    } catch {
      onUpdate(message.id, {
        checklistItems: message.checklistItems,
        isDone: message.isDone,
      })
    }
  }

  function startEditing() {
    setTitle(message.text)
    setDraftItems(
      message.checklistItems.map((item) => ({ text: item.text, isDone: item.isDone }))
    )
    setEditing(true)
  }

  async function saveEdit() {
    const items = draftItems
      .map((item) => ({ ...item, text: item.text.trim() }))
      .filter((item) => item.text)

    if (!title.trim() || items.length < 2) return
    setSaving(true)

    try {
      const updated = await utils.client.message.updateChecklist.mutate({
        id: message.id,
        title: title.trim(),
        items,
      })
      onUpdate(message.id, updated as unknown as ChatMessage)
      setEditing(false)
    } catch {
      /* silent */
    }
    setSaving(false)
  }

  const time = new Date(message.createdAt).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  })

  return (
    <div className="flex flex-col items-end">
      <div className="neo-panel w-full max-w-[390px] rotate-[0.25deg] rounded-2xl bg-[var(--accent)] p-4 text-[var(--text)]">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border-2 border-[var(--neo-line)] bg-[var(--paper)]">
              <FiList size={17} />
            </div>
            <div className="min-w-0">
              <p className="break-words font-sora text-sm font-black select-none">{message.text}</p>
              <p className="mt-0.5 text-[11px] font-semibold opacity-65">
                {completed} dari {total} selesai
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={startEditing}
            disabled={isPending}
            className="neo-button flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--surface)] disabled:opacity-40"
            aria-label="Edit checklist"
          >
            <FiEdit2 size={14} />
          </button>
        </div>

        <div className="mb-4 h-3 overflow-hidden rounded-md border-2 border-[var(--neo-line)] bg-[var(--surface)]">
          <div
            className="h-full bg-[var(--success)] transition-[width] duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="space-y-2">
          {message.checklistItems.map((item) => (
            <label
              key={item.id}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border-2 border-[var(--neo-line)] bg-[var(--surface)] px-3 py-2.5 transition-opacity ${
                item.isDone ? "opacity-70" : ""
              }`}
            >
              <input
                type="checkbox"
                checked={item.isDone}
                disabled={isPending}
                onChange={(event) => toggleItem(item.id, event.target.checked)}
                className="sr-only"
              />
              <span
                className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border-2 border-[var(--neo-line)] ${
                  item.isDone ? "bg-[var(--success)] text-[var(--text)]" : "bg-[var(--paper)]"
                }`}
              >
                {item.isDone && <FiCheck size={13} strokeWidth={3} />}
              </span>
              <span className="text-sm leading-5 select-none">
                {item.text}
              </span>
            </label>
          ))}
        </div>
      </div>

      <span className="mt-1 pr-1 text-[10px] tabular-nums text-[var(--text3)]">{time}</span>

      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-[#10201999] p-3 sm:items-center"
          onClick={(event) => event.target === event.currentTarget && setEditing(false)}
        >
          <div className="neo-panel w-full max-w-md rounded-2xl bg-[var(--surface)] p-5">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-sora text-base font-bold">Edit Checklist</h2>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="neo-button flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--surface2)]"
              >
                <FiX size={16} />
              </button>
            </div>

            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="neo-input mb-4 w-full rounded-xl bg-[var(--surface2)] px-4 py-3 text-sm outline-none"
            />

            <div className="max-h-72 space-y-3 overflow-y-auto p-1">
              {draftItems.map((item, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    value={item.text}
                    onChange={(event) => setDraftItems((current) => current.map(
                      (draft, draftIndex) => draftIndex === index
                        ? { ...draft, text: event.target.value }
                        : draft
                    ))}
                    className="neo-input min-w-0 flex-1 rounded-lg bg-[var(--surface2)] px-3 py-2.5 text-sm outline-none"
                  />
                  <button
                    type="button"
                    disabled={draftItems.length <= 2}
                    onClick={() => setDraftItems((current) => current.filter(
                      (_, draftIndex) => draftIndex !== index
                    ))}
                    className="neo-button flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--surface2)] text-[var(--coral)] disabled:opacity-35"
                  >
                    <FiTrash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              disabled={draftItems.length >= 20}
              onClick={() => setDraftItems((current) => [
                ...current,
                { text: "", isDone: false },
              ])}
              className="mt-4 flex items-center gap-2 text-xs font-bold text-[var(--text2)]"
            >
              <FiPlus size={15} />
              Tambah item
            </button>

            <button
              type="button"
              onClick={saveEdit}
              disabled={saving}
              className="neo-button mt-6 w-full rounded-xl bg-[var(--accent)] py-3 text-sm font-bold text-[var(--accent-ink)] disabled:opacity-45"
            >
              {saving ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
})

export default ChecklistBubble