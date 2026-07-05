"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { FiAlertTriangle, FiX } from "react-icons/fi"
import { useQueryClient } from "@tanstack/react-query"
import { getQueryKey } from "@trpc/react-query"
import { trpc } from "@/lib/trpc"
import { ModalPortal } from "@/components/ui/ModalPortal"

type Props = {
  roomId: string
  roomName: string
  onClose: () => void
}

export default function DeleteRoomModal({ roomId, roomName, onClose }: Props) {
  const queryClient = useQueryClient()
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const deleteRoom = trpc.room.delete.useMutation()

  async function handleDelete() {
    setLoading(true)
    await deleteRoom.mutateAsync({ id: roomId })
    setLoading(false)
    onClose()
    const roomsKey = getQueryKey(trpc.room.list)
    queryClient.invalidateQueries({ queryKey: roomsKey })
    router.push("/")
  }

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-50 flex items-end justify-center"
        style={{ background: "#00000070", backdropFilter: "blur(4px)" }}
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
      <div className="w-full max-w-md rounded-t-3xl p-6 pb-10 bg-[var(--surface)] border-t border-[var(--border2)]">
        <div className="w-9 h-1 rounded-full mx-auto mb-5 bg-[var(--border2)]" />

        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <FiAlertTriangle size={16} className="text-red-400" />
            <p className="font-semibold font-sora text-base text-[var(--text)]">Hapus Room</p>
          </div>
          <button onClick={onClose} className="text-[var(--text3)]">
            <FiX size={20} />
          </button>
        </div>

        <p className="text-sm text-[var(--text2)] mb-2 leading-relaxed">
          Yakin mau hapus room <span className="font-semibold text-[var(--text)]">{roomName}</span>?
        </p>
        <p className="text-xs text-[var(--text3)] mb-6">
          Semua pesan di dalam room ini akan ikut terhapus dan tidak bisa dikembalikan.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl text-sm font-semibold font-sora border transition-colors"
            style={{ borderColor: "var(--border2)", color: "var(--text)" }}
          >
            Batal
          </button>
          <button
            onClick={handleDelete}
            disabled={loading}
            className="flex-1 py-3 rounded-xl text-sm font-semibold font-sora transition-opacity"
            style={{ background: "#ef4444", color: "white", opacity: loading ? 0.5 : 1 }}
          >
            {loading ? "Menghapus..." : "Hapus"}
          </button>
        </div>
      </div>
    </div>
    </ModalPortal>
  )
}