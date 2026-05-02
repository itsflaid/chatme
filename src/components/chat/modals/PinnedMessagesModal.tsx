"use client"

import { useRouter } from "next/navigation"
import { FiX, FiBookmark, FiCheck } from "react-icons/fi"
import { Message } from "@prisma/client"

type Props = {
  messages: Message[]
  onClose: () => void
}

export default function PinnedMessagesModal({ messages, onClose }: Props) {
  const router = useRouter()
  const pinned = messages.filter(m => m.isPinned && !m.isBot)

  async function handleUnpin(messageId: string) {
    await fetch(`/api/messages/${messageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPinned: false }),
    })
    router.refresh()
  }

  async function handleDone(messageId: string) {
    await fetch(`/api/messages/${messageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDone: true, isPinned: false }),
    })
    router.refresh()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: "#00000070", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md rounded-t-3xl p-6 pb-10 bg-[var(--surface)] border-t border-[var(--border2)]">
        <div className="w-9 h-1 rounded-full mx-auto mb-5 bg-[var(--border2)]" />

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FiBookmark size={15} className="text-[var(--accent)]" />
            <p className="font-semibold font-sora text-sm text-[var(--text)]">
              Pesan Dipin
            </p>
          </div>
          <button onClick={onClose} className="text-[var(--text3)]">
            <FiX size={18} />
          </button>
        </div>

        {pinned.length === 0 ? (
          <p className="text-sm text-center py-8 text-[var(--text3)]">
            Belum ada pesan yang dipin
          </p>
        ) : (
          <div className="flex flex-col gap-3 max-h-80 overflow-y-auto">
            {pinned.map((msg) => (
              <div
                key={msg.id}
                className="flex items-start gap-3 p-3 rounded-xl border"
                style={{ background: "var(--surface2)", borderColor: "var(--border2)" }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[var(--text)] leading-relaxed">{msg.text}</p>
                  <p className="text-[11px] mt-1 text-[var(--text3)]">
                    {new Date(msg.createdAt).toLocaleDateString("id-ID", {
                      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
                    })}
                  </p>
                </div>

                <div className="flex flex-col gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => handleDone(msg.id)}
                    className="w-7 h-7 rounded-full flex items-center justify-center transition-opacity hover:opacity-80"
                    style={{ background: "var(--accent)", color: "var(--bg)" }}
                    title="Tandai selesai"
                  >
                    <FiCheck size={13} />
                  </button>
                  <button
                    onClick={() => handleUnpin(msg.id)}
                    className="w-7 h-7 rounded-full flex items-center justify-center transition-opacity hover:opacity-80"
                    style={{ background: "var(--surface3)", color: "var(--text2)" }}
                    title="Unpin"
                  >
                    <FiBookmark size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}