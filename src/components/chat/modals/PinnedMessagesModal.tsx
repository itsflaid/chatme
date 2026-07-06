"use client"

import { FiX, FiBookmark, FiCheck } from "react-icons/fi"
import { Message } from "@prisma/client"
import { useQueryClient } from "@tanstack/react-query"
import { getRoomsKey } from "@/hooks/useMessages"
import { trpc } from "@/lib/trpc"
import { ModalPortal } from "@/components/ui/ModalPortal"

type Props = {
  messages: Message[]
  onClose: () => void
}

export default function PinnedMessagesModal({ messages, onClose }: Props) {
  const queryClient = useQueryClient()
  const pinned = messages.filter(m => m.isPinned && !m.isBot)

  const utils = trpc.useUtils()
  const roomsKey = getRoomsKey()

  async function handleUnpin(messageId: string) {
    await utils.client.message.update.mutate({ id: messageId, isPinned: false })
    queryClient.invalidateQueries({ queryKey: roomsKey })
  }

  async function handleDone(messageId: string) {
    await utils.client.message.update.mutate({ id: messageId, isDone: true, isPinned: false })
    queryClient.invalidateQueries({ queryKey: roomsKey })
  }

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-50 flex items-end justify-center"
        style={{ background: "#00000070", backdropFilter: "blur(4px)" }}
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
      <div className="neo-panel w-[calc(100%-24px)] max-w-md rounded-2xl bg-[var(--surface)] p-6 pb-8">
        <div className="w-12 h-2 rotate-1 rounded-md mx-auto mb-5 bg-[var(--accent)] border-2 border-[var(--neo-line)]" />

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
                className="neo-card flex items-start gap-3 rounded-xl p-3"
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
                    className="neo-button w-7 h-7 rounded-lg flex items-center justify-center transition-opacity hover:opacity-80"
                    style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
                    title="Tandai selesai"
                  >
                    <FiCheck size={13} />
                  </button>
                  <button
                    onClick={() => handleUnpin(msg.id)}
                    className="neo-button w-7 h-7 rounded-lg flex items-center justify-center transition-opacity hover:opacity-80"
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
    </ModalPortal>
  )
}