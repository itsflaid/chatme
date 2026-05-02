"use client"
import { motion } from "framer-motion"
import { Message } from "@prisma/client"
import { IoCheckmarkDone } from "react-icons/io5"
import { FiBookmark } from "react-icons/fi"
import { userBubbleAnim } from "@/lib/animation"

type Props = {
  message: Message
  isNew?: boolean
}

export default function MessageBubble({ message, isNew = true }: Props) {
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
      <div className="max-w-[82%] rounded-[18px_18px_4px_18px] px-4 py-2.5 relative bg-[var(--accent)]">
        {message.isPinned && (
          <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[var(--bg)] flex items-center justify-center">
            <FiBookmark size={11} className="text-[var(--accent)]" />
          </div>
        )}

        <p className="text-sm leading-relaxed break-words text-[var(--bg)]">
          {message.text}
        </p>

        {message.remindAt && !message.isRemindDone && (
          <span className="text-[10px] flex items-center gap-1 mt-1 text-[#3a2e00]">
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