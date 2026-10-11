"use client"

import { useState, useRef, useEffect } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { FiArrowLeft, FiMoreVertical, FiX, FiBookmark, FiTrash2, FiCopy } from "react-icons/fi"
import { IoSearch, IoNotificationsOutline } from "react-icons/io5"
import { Message } from "@prisma/client"
import RoomSettingsMenu from "./modals/RoomSettingsMenu"
import EditRoomModal from "./modals/EditRoomModal"
import DeleteRoomModal from "./modals/DeleteRoomModal"
import PinnedMessagesModal from "./modals/PinnedMessagesModal"
import ReminderListModal from "./modals/ReminderListModal"
import ClearMessagesModal from "./modals/ClearMessagesModal"
import { getRoomIconSrc } from "@/lib/roomIcons"
import SidebarToggleButton from "@/components/layouts/SidebarToggleButton"

type Props = {
  roomId: string
  name: string
  icon: string
  description: string | null
  messageCount: number
  reminders: Message[]
  messages: Message[]
  onReminderDone: (messageId: string) => void
  onClear: () => Promise<void>
  onClearBots: () => Promise<void>

  searchQuery: string
  onSearch: (query: string) => void

  selectionMode: boolean
  selectedCount: number
  onCancelSelection: () => void
  onBulkPin: () => void
  onBulkDeleteRequest: () => void
  onBulkCopy: () => void
}

export default function ChatHeader({
  roomId,
  name,
  icon,
  description,
  messageCount,
  reminders,
  messages,
  onReminderDone,
  onClear,
  onClearBots,
  searchQuery,
  onSearch,
  selectionMode,
  selectedCount,
  onCancelSelection,
  onBulkPin,
  onBulkDeleteRequest,
  onBulkCopy,
}: Props) {
  const router = useRouter()

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back()
    } else {
      router.push("/")
    }
  }

  const menuBtnRef = useRef<HTMLButtonElement>(null)
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 })
  const [showMenu, setShowMenu] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [showPinned, setShowPinned] = useState(false)
  const [showReminders, setShowReminders] = useState(false)
  const [showClear, setShowClear] = useState(false)
  const [showClearBots, setShowClearBots] = useState(false)
  const [showMobileSearch, setShowMobileSearch] = useState(false)

  useEffect(() => {
    if (!selectionMode) return
    const id = requestAnimationFrame(() => setShowMobileSearch(false))
    return () => cancelAnimationFrame(id)
  }, [selectionMode])

  function handleMenuOpen() {
    if (menuBtnRef.current) {
      const rect = menuBtnRef.current.getBoundingClientRect()
      setMenuPos({ x: rect.right, y: rect.bottom })
    }
    setShowMenu(true)
  }

  return (
    <>
      <div className="relative m-3 mb-0 flex items-center gap-3 rounded-xl bg-[var(--surface)] px-3 py-3 neo-panel">
        {selectionMode ? (
          <>
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <button
                onClick={onCancelSelection}
                className="neo-button w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--paper)] transition text-[var(--text)]"
                aria-label="Batalkan pilihan"
              >
                <FiX size={20} />
              </button>
              <span className="text-sm font-semibold text-[var(--text)]">
                {selectedCount} dipilih
              </span>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={onBulkPin}
                disabled={selectedCount === 0}
                className="neo-button rounded-lg bg-[var(--surface2)] p-2 transition text-[var(--text2)] disabled:opacity-30"
                aria-label="Pin catatan terpilih"
              >
                <FiBookmark size={18} />
              </button>
              <button
                onClick={onBulkDeleteRequest}
                disabled={selectedCount === 0}
                className="neo-button rounded-lg bg-[var(--surface2)] p-2 transition text-[var(--coral)] disabled:opacity-30"
                aria-label="Hapus catatan terpilih"
              >
                <FiTrash2 size={18} />
              </button>
              <button
                onClick={onBulkCopy}
                disabled={selectedCount === 0}
                className="neo-button rounded-lg bg-[var(--surface2)] p-2 transition text-[var(--text2)] disabled:opacity-30"
                aria-label="Salin catatan terpilih"
              >
                <FiCopy size={18} />
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
              <button
                onClick={handleBack}
                className="neo-button w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--paper)] transition text-[var(--text)] md:hidden"
              >
                <FiArrowLeft size={20} />
              </button>

              <SidebarToggleButton />

              <button
                onClick={() => router.push(`/room/${roomId}/info`)}
                className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3 text-left"
              >
                <div className="neo-button w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-[var(--surface2)] overflow-hidden">
                  <Image
                    src={getRoomIconSrc(icon)}
                    alt={icon}
                    width={50}
                    height={50}
                    className="object-contain"
                  />
                </div>

                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="text-sm font-semibold truncate text-[var(--text)]">{name}</span>
                  <span className="text-xs text-[var(--text3)] truncate">
                    {reminders.length} reminder · {messageCount} catatan
                  </span>
                </div>
              </button>
            </div>

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
                  placeholder="Cari catatan..."
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
                aria-label="Cari catatan"
                aria-expanded={showMobileSearch}
              >
                <IoSearch size={18} />
              </button>

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

              <button
                ref={menuBtnRef}
                onClick={handleMenuOpen}
                className="neo-button rounded-lg bg-[var(--surface2)] p-2 transition text-[var(--text2)]"
              >
                <FiMoreVertical size={18} />
              </button>
            </div>
          </>
        )}

        {showMenu && (
          <RoomSettingsMenu
            x={menuPos.x}
            y={menuPos.y}
            onInfo={() => router.push(`/room/${roomId}/info`)}
            onEdit={() => setShowEdit(true)}
            onPinned={() => setShowPinned(true)}
            onClear={() => setShowClear(true)}
            onClearBots={() => setShowClearBots(true)}
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
              placeholder="Cari catatan..."
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

      {showReminders && (
        <ReminderListModal
          reminders={reminders}
          onDone={(id) => {
            onReminderDone(id)
            setShowReminders(false)
          }}
          onClose={() => setShowReminders(false)}
        />
      )}

      {showEdit && (
        <EditRoomModal
          roomId={roomId}
          initialName={name}
          initialIcon={icon}
          initialDescription={description}
          onClose={() => setShowEdit(false)}
        />
      )}

      {showClear && (
        <ClearMessagesModal
          title="Bersihkan Catatan"
          description="Semua catatan di room ini akan dihapus permanen dan tidak bisa dikembalikan. Lanjutkan?"
          confirmLabel="Bersihkan"
          onConfirm={onClear}
          onClose={() => setShowClear(false)}
        />
      )}

      {showClearBots && (
        <ClearMessagesModal
          title="Bersihkan Riwayat Pengingat"
          description="Semua bubble pengingat otomatis di room ini akan dihapus permanen. Catatan kamu tidak akan terpengaruh. Lanjutkan?"
          confirmLabel="Bersihkan"
          onConfirm={onClearBots}
          onClose={() => setShowClearBots(false)}
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
