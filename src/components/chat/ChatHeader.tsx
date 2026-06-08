"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { FiArrowLeft, FiMoreVertical, FiX, FiCheck } from "react-icons/fi"
import { IoSearch, IoNotificationsOutline } from "react-icons/io5"
import { Message } from "@prisma/client"
import RoomSettingsMenu from "./modals/RoomSettingsMenu"
import EditRoomModal from "./modals/EditRoomModal"
import DeleteRoomModal from "./modals/DeleteRoomModal"
import PinnedMessagesModal from "./modals/PinnedMessagesModal"

type Props = {
  roomId: string
  name: string
  icon: string
  description: string | null
  messageCount: number
  pendingCount: number
  reminders: Message[]
  messages: Message[]
  onReminderDone: (messageId: string) => void

  // Props untuk search (baru)
  searchQuery: string
  onSearch: (query: string) => void
}

export default function ChatHeader({
  roomId,
  name,
  icon,
  description,
  messageCount,
  pendingCount,
  reminders,
  messages,
  onReminderDone,
  searchQuery,
  onSearch,
}: Props) {
  const router = useRouter()
  const [showMenu, setShowMenu] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [showPinned, setShowPinned] = useState(false)
  const [showReminders, setShowReminders] = useState(false)
  const [showMobileSearch, setShowMobileSearch] = useState(false)

  return (
    <>
      <div className="relative m-3 mb-0 flex items-center gap-3 rounded-xl bg-[var(--surface)] px-3 py-3 neo-panel">

        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <button
            onClick={() => router.push("/")}
            className="neo-button w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--paper)] transition text-[var(--text)]"
          >
            <FiArrowLeft size={20} />
          </button>

          <div className="neo-button w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0 bg-[var(--surface2)]">
            {icon}
          </div>

          <div className="flex min-w-0 flex-1 flex-col">
            <span className="text-sm font-semibold truncate text-[var(--text)]">{name}</span>
            <span className="text-xs text-[var(--text3)] truncate">
              {pendingCount} reminder · {messageCount} pesan
            </span>
          </div>
        </div>

        {/* SEARCH BAR */}
        <div className="hidden flex-1 justify-center px-2 md:flex">
          <div className="relative w-full max-w-xs">
            <IoSearch
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text3)]"
            />
            
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Cari pesan..."
              className="neo-input w-full rounded-xl bg-[var(--surface2)] py-1.5 pl-9 pr-10 text-sm text-[var(--text)] placeholder:text-[var(--text3)] outline-none focus:ring-1 focus:ring-[var(--accent)] transition"
            />

            {searchQuery && (
              <button
                onClick={() => onSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text3)] hover:text-[var(--text2)] transition"
              >
                <FiX size={16} />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={() => setShowMobileSearch(value => !value)}
            className="neo-button relative rounded-lg bg-[var(--surface2)] p-2 text-[var(--text2)] transition md:hidden"
            aria-label="Cari pesan"
            aria-expanded={showMobileSearch}
          >
            <IoSearch size={18} />
          </button>

          {/* bell + badge reminder */}
          <button
            onClick={() => setShowReminders(true)}
            className="neo-button relative rounded-lg bg-[var(--surface2)] p-2 transition"
          >
            <IoNotificationsOutline size={18} className="text-[var(--text2)]" />
            {reminders.length > 0 && (
              <span
                className="absolute -right-1 -top-1 flex h-4 w-4 rotate-6 items-center justify-center rounded-md border-2 border-[var(--neo-line)] text-[10px] font-bold font-sora"
                style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
              >
                {reminders.length}
              </span>
            )}
          </button>

          {/* titik tiga */}
          <button
            onClick={() => setShowMenu(true)}
            className="neo-button rounded-lg bg-[var(--surface2)] p-2 transition text-[var(--text2)]"
          >
            <FiMoreVertical size={18} />
          </button>
        </div>

        {/* dropdown menu */}
        {showMenu && (
          <RoomSettingsMenu
            onEdit={() => setShowEdit(true)}
            onPinned={() => setShowPinned(true)}
            onDelete={() => setShowDelete(true)}
            onClose={() => setShowMenu(false)}
          />
        )}
      </div>

      {showMobileSearch && (
        <div className="mx-3 mt-3 md:hidden">
          <div className="relative">
            <IoSearch
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text3)]"
            />
            <input
              autoFocus
              type="text"
              value={searchQuery}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Cari pesan..."
              className="neo-input w-full rounded-xl bg-[var(--surface)] py-2.5 pl-9 pr-10 text-sm text-[var(--text)] placeholder:text-[var(--text3)] outline-none focus:ring-1 focus:ring-[var(--accent)]"
            />
            <button
              onClick={() => {
                onSearch("")
                setShowMobileSearch(false)
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text3)]"
              aria-label="Tutup pencarian"
            >
              <FiX size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Modal Reminder List */}
      {showReminders && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: "#00000070", backdropFilter: "blur(4px)" }}
          onClick={(e) => e.target === e.currentTarget && setShowReminders(false)}
        >
          <div className="neo-panel w-[calc(100%-24px)] max-w-md rounded-2xl bg-[var(--surface)] p-6 pb-8">
            <div className="w-12 h-2 -rotate-1 rounded-md mx-auto mb-5 bg-[var(--accent)] border-2 border-[var(--neo-line)]" />
            <div className="flex items-center justify-between mb-4">
              <p className="font-semibold font-sora text-sm text-[var(--text)]">Reminder Aktif</p>
              <button onClick={() => setShowReminders(false)} className="text-[var(--text3)]">
                <FiX size={18} />
              </button>
            </div>

            {reminders.length === 0 ? (
              <p className="text-sm text-center py-6 text-[var(--text3)]">Tidak ada reminder aktif</p>
            ) : (
              <div className="flex flex-col gap-3 max-h-80 overflow-y-auto">
                {reminders.map((r) => (
                  <div
                    key={r.id}
                    className="neo-card flex items-center gap-3 rounded-xl p-3"
                    style={{ background: "var(--surface2)", borderColor: "var(--border2)" }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate text-[var(--text)]">{r.text}</p>
                      {r.remindAt && (
                        <p className="text-[11px] mt-0.5 text-[var(--accent)]">
                          🔔 {new Date(r.remindAt).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        onReminderDone(r.id)
                        setShowReminders(false)
                      }}
                      className="neo-button w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 hover:opacity-80"
                      style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
                    >
                      <FiCheck size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal lainnya */}
      {showEdit && (
        <EditRoomModal
          roomId={roomId}
          initialName={name}
          initialIcon={icon}
          initialDescription={description}
          onClose={() => setShowEdit(false)}
        />
      )}

      {showDelete && (
        <DeleteRoomModal
          roomId={roomId}
          roomName={name}
          onClose={() => setShowDelete(false)}
        />
      )}

      {showPinned && (
        <PinnedMessagesModal
          messages={messages}
          onClose={() => setShowPinned(false)}
        />
      )}
    </>
  )
}
