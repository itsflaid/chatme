"use client"

import { useEffect, useState, memo } from "react"
import { motion } from "framer-motion"
import { Message } from "@prisma/client"
import { IoCheckmarkDone } from "react-icons/io5"
import { FiBell, FiBookmark, FiCheck } from "react-icons/fi"
import { userBubbleAnim } from "@/lib/animation"

type Props = {
  message: Message
  isNew?: boolean
  searchQuery?: string
}

function highlightText(text: string, query: string) {
  if (!query.trim()) return <>{text}</>
  const parts = text.split(new RegExp(`(${query})`, "gi"))

  return (
    <>
      {parts.map((part, index) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark
            key={index}
            className="rounded-sm bg-[var(--bg)] px-0.5 font-semibold text-[var(--accent)]"
          >
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  )
}

const MessageBubble = memo(function MessageBubble({
  message,
  isNew = false,
  searchQuery = "",
}: Props) {
  const [isReminderDue, setIsReminderDue] = useState(false)

  const time = new Date(message.createdAt).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  })
  const editedTime = message.editedAt
    ? new Date(message.editedAt).toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null
  const hasActiveReminder = Boolean(message.remindAt && !message.isRemindDone)

  useEffect(() => {
    let timer: number | undefined

    function updateReminderStatus() {
      if (!message.remindAt || message.isRemindDone) {
        setIsReminderDue(false)
        return
      }

      const delay = new Date(message.remindAt).getTime() - Date.now()
      if (delay <= 0) {
        setIsReminderDue(true)
        return
      }

      setIsReminderDue(false)
      timer = window.setTimeout(
        updateReminderStatus,
        Math.min(delay, 2_147_483_647)
      )
    }

    timer = window.setTimeout(updateReminderStatus, 0)

    return () => window.clearTimeout(timer)
  }, [message.isRemindDone, message.remindAt])

  return (
    <motion.div
      initial={isNew ? userBubbleAnim.initial : false}
      animate={userBubbleAnim.animate}
      transition={userBubbleAnim.transition}
      className="flex flex-col items-end"
    >
      <div
        className="neo-card relative max-w-[82%] rotate-[0.4deg] rounded-xl rounded-br-sm bg-[var(--accent)] px-4 py-2.5"
        style={{ opacity: message.isDone ? 0.78 : 1 }}
      >
        {(message.isPinned || hasActiveReminder || message.isDone) && (
          <div className="absolute -right-2 -top-2 flex items-center gap-1">
            {message.isPinned && (
              <div className="flex h-6 w-6 -rotate-6 items-center justify-center rounded-md border-2 border-[var(--neo-line)] bg-[var(--bg)] shadow-[2px_2px_0_var(--neo-shadow)]">
                <FiBookmark size={11} className="text-[var(--accent)]" />
              </div>
            )}

            {hasActiveReminder && (
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-md border-2 border-[var(--neo-line)] shadow-[2px_2px_0_var(--neo-shadow)] ${
                  isReminderDue
                    ? "rotate-6 bg-[var(--coral)] text-[var(--text)] opacity-100"
                    : "bg-[var(--surface)] text-[var(--text)] opacity-60"
                }`}
                title={isReminderDue ? "Waktunya mengingatkan" : "Reminder dijadwalkan"}
              >
                <FiBell size={12} strokeWidth={2.5} />
              </div>
            )}

            {message.isDone && (
              <div className="flex h-6 w-6 rotate-6 items-center justify-center rounded-md border-2 border-[var(--neo-line)] bg-[var(--success)] text-[var(--text)] shadow-[2px_2px_0_var(--neo-shadow)]">
                <FiCheck size={13} strokeWidth={3} />
              </div>
            )}
          </div>
        )}

        <p className="break-words text-sm leading-relaxed text-[var(--accent-ink)] select-none">
          {highlightText(message.text, searchQuery)}
        </p>

        {hasActiveReminder && message.remindAt && (
          <span className="mt-1.5 block text-[10px] font-semibold text-[var(--accent-ink)] opacity-70">
            Ingatkan{" "}
            {new Date(message.remindAt).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        )}
      </div>

      <div className="mt-1 flex items-center gap-1 pr-1">
        {editedTime && (
          <span className="text-[10px] text-[var(--text3)]">
            Diedit {editedTime}
          </span>
        )}
        <span className="text-[10px] tabular-nums text-[var(--text3)]">
          {time}
        </span>
        <IoCheckmarkDone
          size={16}
          className={`transition-all ${
            message.isDone ? "text-[var(--success)]" : "text-[var(--text3)]"
          }`}
        />
      </div>
    </motion.div>
  )
})

export default MessageBubble