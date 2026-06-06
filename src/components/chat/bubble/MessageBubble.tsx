"use client"
import { motion } from "framer-motion"
import { Message } from "@prisma/client"
import { IoCheckmarkDone } from "react-icons/io5"
import { FiBookmark } from "react-icons/fi"
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
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark
            key={i}
            style={{
              background: "var(--bg)",
              color: "var(--accent)",
              borderRadius: "3px",
              padding: "0 2px",
              fontWeight: 600,
            }}
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

export default function MessageBubble({
  message,
  isNew = false,
  searchQuery = "",
}: Props) {
  if (!message) return null

  const time = new Date(message.createdAt).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  })

  return (
    <motion.div
      layout
      initial={isNew ? userBubbleAnim.initial : false}
      animate={userBubbleAnim.animate}
      transition={userBubbleAnim.transition}
      className="flex flex-col items-end"
    >
      <div
        className="neo-card max-w-[82%] rotate-[0.4deg] rounded-xl rounded-br-sm px-4 py-2.5 relative bg-[var(--accent)]"
        // style={{ opacity: message.isDone ? 0.5 : 1 }}
      >
        {message.isPinned && (
            <div className="absolute -top-2 -right-2 w-6 h-6 rotate-12 rounded-md border-2 border-[var(--neo-line)] bg-[var(--bg)] flex items-center justify-center shadow-[2px_2px_0_var(--neo-shadow)]">
            <FiBookmark size={11} className="text-[var(--accent)]" />
          </div>
        )}

        <p
          className="text-sm leading-relaxed break-words text-[var(--accent-ink)]"
          style={{ textDecoration: message.isDone ? "line-through" : "none" }}
        >
          {highlightText(message.text, searchQuery)}
        </p>

        {message.remindAt && !message.isRemindDone && (
          <span className="mt-2 flex w-fit items-center gap-1 rounded-md border-2 border-[var(--neo-line)] bg-[var(--bg)] px-2 py-0.5 text-[10px] text-[var(--accent)]">
            🔔{" "}
            {new Date(message.remindAt).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1 mt-1 pr-1">
        <span className="text-[10px] text-[var(--text3)] tabular-nums">
          {time}
        </span>
        <IoCheckmarkDone
          size={16}
          className={`transition-all ${
            message.isDone ? "text-[var(--accent)]" : "text-[var(--text3)]"
          }`}
        />
      </div>
    </motion.div>
  )
}
