"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import {
  FiArrowLeft, FiEdit2, FiTrash2, FiBookmark, FiBell,
  FiCheckSquare, FiCalendar, FiMessageSquare, FiChevronRight,
} from "react-icons/fi"
import { trpc } from "@/lib/trpc"
import { useRoomInfo } from "@/hooks/useRoom"
import { useRoomPinnedMessages, useRoomActiveReminders, useMarkRemindedAndDone } from "@/hooks/useMessages"
import { getRoomIconSrc } from "@/lib/roomIcons"
import { SkeletonBlock } from "@/components/ui/Skeleton"
import SidebarToggleButton from "@/components/layouts/SidebarToggleButton"
import EditRoomModal from "./modals/EditRoomModal"
import DeleteRoomModal from "./modals/DeleteRoomModal"
import PinnedMessagesModal from "./modals/PinnedMessagesModal"
import ReminderListModal from "./modals/ReminderListModal"

type Props = { roomId: string }

export default function RoomInfoView({ roomId }: Props) {
  const router = useRouter()
  const utils = trpc.useUtils()
  const { data: info, isLoading } = useRoomInfo(roomId)

  const [showEdit, setShowEdit] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [showPinned, setShowPinned] = useState(false)
  const [showReminders, setShowReminders] = useState(false)
  const [now] = useState(() => Date.now())

  const pinnedQuery = useRoomPinnedMessages(roomId, showPinned)
  const remindersQuery = useRoomActiveReminders(roomId, showReminders)
  const markRemindedAndDone = useMarkRemindedAndDone(roomId)

  function refreshStats() {
    utils.room.getInfo.invalidate({ id: roomId })
  }

  function closePinned() {
    setShowPinned(false)
    utils.message.listPinned.invalidate({ roomId })
    refreshStats()
  }

  function closeReminders() {
    setShowReminders(false)
    utils.message.listActiveReminders.invalidate({ roomId })
    refreshStats()
  }

  if (isLoading || !info) {
    return (
      <div style={{ background: "var(--bg)", minHeight: "100dvh" }} className="pb-10">
        <div className="m-3 mb-0 flex items-center gap-3 rounded-xl bg-[var(--surface)] px-3 py-3 neo-panel">
          <SkeletonBlock className="h-8 w-8 rounded-lg" />
          <SkeletonBlock className="h-4 w-24 rounded-full" />
        </div>

        <div className="relative m-3 mt-4 rounded-xl bg-[var(--surface)] neo-panel overflow-hidden">
          <div className="absolute left-0 top-0 h-full w-2 bg-[var(--surface3)]" />
          <div className="flex items-start gap-4 pl-7 pr-5 py-5">
            <SkeletonBlock className="shrink-0 h-20 w-20 rounded-xl" />
            <div className="min-w-0 flex-1 pt-1">
              <SkeletonBlock className="mb-2 h-5 w-40 rounded-full" />
              <SkeletonBlock className="mb-3 h-3 w-56 rounded-full" />
              <SkeletonBlock className="h-3 w-28 rounded-full" />
            </div>
          </div>
        </div>

        <div className="mx-3 mt-3 flex gap-3">
          <SkeletonBlock className="flex-1 rounded-xl" />
          <div className="flex flex-1 flex-col gap-3">
            <SkeletonBlock className="h-16 rounded-xl" />
            <SkeletonBlock className="h-16 rounded-xl" />
            <SkeletonBlock className="h-16 rounded-xl" />
          </div>
        </div>

        <div className="m-3 mt-4">
          <SkeletonBlock className="mb-2 h-3 w-24 rounded-full" />
          <div className="rounded-xl bg-[var(--surface)] neo-panel overflow-hidden">
            {[0, 1].map((i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3.5">
                <SkeletonBlock className="h-8 w-8 shrink-0 rounded-lg" />
                <SkeletonBlock className="h-3 w-28 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const tanggalDibuat = new Date(info.createdAt).toLocaleDateString("id-ID", {
    day: "numeric", month: "long", year: "numeric",
  })

  const hariAktif = Math.max(
    0,
    Math.floor((now - new Date(info.createdAt).getTime()) / (1000 * 60 * 60 * 24))
  )

  const checklistTotal = info.checklist.total
  const checklistPercent = checklistTotal > 0
    ? Math.round((info.checklist.selesai / checklistTotal) * 100)
    : null

  return (
    <div style={{ background: "var(--bg)", minHeight: "100dvh" }} className="pb-10">
      <div className="m-3 mb-0 flex items-center gap-3 rounded-xl bg-[var(--surface)] px-3 py-3 neo-panel">
        <button
          onClick={() => router.back()}
          className="neo-button w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--paper)] text-[var(--text)]"
        >
          <FiArrowLeft size={20} />
        </button>
        <p className="font-semibold font-sora text-base text-[var(--text)]">Info Room</p>
        <SidebarToggleButton className="ml-auto" />
      </div>

      <div className="relative m-3 mt-4 rounded-xl bg-[var(--surface)] neo-panel overflow-hidden">
        {/* <div className="absolute left-0 top-0 h-full w-2 bg-[var(--accent)]" /> */}
        <div className="flex items-start gap-4 pl-7 pr-5 py-5">
          <div className="neo-button shrink-0 w-20 h-20 rounded-xl flex items-center justify-center bg-[var(--surface2)] overflow-hidden -rotate-2">
            <Image src={getRoomIconSrc(info.icon)} alt={info.icon} width={80} height={80} className="object-contain" />
          </div>
          <div className="min-w-0 pt-1">
            <p className="font-bold font-sora text-lg text-[var(--text)] leading-tight break-words">
              {info.name}
            </p>
            {info.description && (
              <p className="text-sm text-[var(--text3)] italic mt-1 break-words">
                {info.description}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-3 text-xs text-[var(--text3)]">
              <span className="flex items-center gap-1.5">
                <FiCalendar size={12} />
                {tanggalDibuat}
              </span>
              <span className="inline-flex items-center rounded-full border border-[var(--border2)] px-2 py-0.5 font-medium text-[var(--accent3)] bg-[var(--accent-dim)]">
                {hariAktif === 0 ? "Baru dibuat" : `Aktif ${hariAktif} hari`}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-3 mt-3 flex gap-3">
        <div className="flex-1 rounded-xl p-4 neo-card flex flex-col justify-between bg-[var(--accent2)]">
          <FiMessageSquare size={18} style={{ color: "var(--accent-ink)" }} />
          <div>
            <p className="text-4xl font-bold font-sora leading-none" style={{ color: "var(--accent-ink)" }}>
              {info.totalPesan}
            </p>
            <p className="text-xs mt-2" style={{ color: "var(--accent-ink)", opacity: 0.75 }}>
              Total Catatan
            </p>
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-3">
          <button
            onClick={() => setShowPinned(true)}
            className="neo-card rounded-xl p-3 bg-[var(--surface)] text-left flex items-center gap-3"
          >
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: "var(--accent-dim)" }}>
              <FiBookmark size={15} className="text-[var(--accent2)]" />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-bold font-sora text-[var(--text)] leading-none">{info.pesanDipin}</p>
              <p className="text-[11px] text-[var(--text3)] mt-1">Dipin</p>
            </div>
          </button>

          <button
            onClick={() => setShowReminders(true)}
            className="neo-card rounded-xl p-3 bg-[var(--surface)] text-left flex items-center gap-3"
          >
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(232,117,91,0.15)" }}>
              <FiBell size={15} style={{ color: "var(--coral)" }} />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-bold font-sora text-[var(--text)] leading-none">{info.reminderAktif}</p>
              <p className="text-[11px] text-[var(--text3)] mt-1">Reminder Aktif</p>
            </div>
          </button>

          <div className="neo-card rounded-xl p-3 bg-[var(--surface)] flex flex-col justify-center gap-1.5">
            <div className="flex items-center gap-2">
              <FiCheckSquare size={14} style={{ color: "var(--success)" }} />
              <p className="text-xs text-[var(--text3)]">Checklist</p>
            </div>
            {checklistPercent === null ? (
              <p className="text-xs text-[var(--text3)]">Belum ada checklist</p>
            ) : (
              <>
                <div className="flex items-baseline gap-1.5">
                  <p className="text-lg font-bold font-sora text-[var(--text)] leading-none">{checklistPercent}%</p>
                  <p className="text-[11px] text-[var(--text3)]">{info.checklist.selesai}/{checklistTotal}</p>
                </div>
                <div className="h-1.5 rounded-full bg-[var(--surface3)] overflow-hidden mt-0.5">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${checklistPercent}%`, background: "var(--success)" }}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="m-3 mt-4">
        <p className="text-xs font-semibold text-[var(--text3)] uppercase tracking-wide mb-2 px-1">
          Kelola Room
        </p>
        <div className="rounded-xl bg-[var(--surface)] neo-panel overflow-hidden">
          <button
            onClick={() => setShowEdit(true)}
            className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "var(--accent-dim)" }}>
              <FiEdit2 size={14} className="text-[var(--accent2)]" />
            </div>
            <p className="flex-1 text-sm font-medium text-[var(--text)]">Edit Room</p>
            <FiChevronRight size={16} className="text-[var(--text3)]" />
          </button>

          <div className="border-t border-dashed" style={{ borderColor: "var(--border)" }} />

          <button
            onClick={() => setShowDelete(true)}
            className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
            style={{ background: "rgba(232,117,91,0.08)" }}
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(232,117,91,0.18)" }}>
              <FiTrash2 size={14} style={{ color: "var(--coral)" }} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium" style={{ color: "var(--coral)" }}>Hapus Room</p>
            </div>
          </button>
        </div>
      </div>

      {showEdit && (
        <EditRoomModal
          roomId={info.id}
          initialName={info.name}
          initialIcon={info.icon}
          initialDescription={info.description}
          onClose={() => { setShowEdit(false); refreshStats() }}
        />
      )}

      {showDelete && (
        <DeleteRoomModal roomId={info.id} roomName={info.name} onClose={() => setShowDelete(false)} />
      )}

      {showPinned && (
        <PinnedMessagesModal messages={pinnedQuery.data ?? []} onClose={closePinned} />
      )}

      {showReminders && (
        <ReminderListModal
          reminders={remindersQuery.data ?? []}
          onDone={(id) => {
            markRemindedAndDone.mutate({ id })
          }}
          onClose={closeReminders}
        />
      )}
    </div>
  )
}