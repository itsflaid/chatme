"use client"

import { motion, AnimatePresence } from "framer-motion"
import { useState, useEffect } from "react"
import { Message } from "@prisma/client"
import { FiBell } from "react-icons/fi"
import { botBubbleAnim } from "@/lib/animation"

type Props = {
  message: Message
  sourceMessage?: Message | null
  onDone: () => void
  onSnooze: () => void
  isNew?: boolean
}

function truncate(text: string, max = 32) {
  return text.length > max ? text.slice(0, max) + "…" : text
}

export default function BotBubble({
  message,
  sourceMessage,
  onDone,
  onSnooze,
  isNew = false,
}: Props) {
  const [cardStatus, setCardStatus] = useState<"idle" | "done" | "snoozed">("idle")

  // Derive state langsung dari prop (paling clean & menghindari warning)
  const showCard = !message.isRemindDone

  const time = new Date(message.createdAt).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  })

  const reminderText = sourceMessage?.text ?? "Tidak ada teks pengingat"
  const cardId = `bot-card-${message.id}`

  // Efek shake hanya jalan kalau card masih ditampilkan
  useEffect(() => {
    if (!showCard) return

    const el = document.getElementById(cardId)
    if (!el) return

    const shake = () => {
      el.classList.add("animate-shake")
      setTimeout(() => el.classList.remove("animate-shake"), 600)
    }

    shake()
    const interval = setInterval(shake, 5000)
    return () => clearInterval(interval)
  }, [cardId, showCard])

  function handleDone() {
    setCardStatus("done")
    onDone()
  }

  function handleSnooze() {
    setCardStatus("snoozed")
    onSnooze()
  }

  return (
    <motion.div
      layout
      initial={isNew ? botBubbleAnim.initial : false}
      animate={botBubbleAnim.animate}
      transition={botBubbleAnim.transition}
      className="flex flex-col items-start gap-1 my-2"
    >
      {/* bubble teks — selalu ada */}
      <div className="flex items-end gap-2">
        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mb-1 bg-[var(--surface2)] border border-[var(--border)]">
          <FiBell size={16} className="text-[var(--accent)]" />
        </div>
        <div
          className="rounded-[18px_18px_18px_4px] px-4 py-2.5 max-w-[240px]"
          style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
        >
          <p className="text-sm leading-relaxed text-[var(--text)] line-clamp-2">
            🔔 Jangan lupa: {truncate(reminderText)}
          </p>
        </div>
      </div>

      <p className="ml-10 text-[10px] tabular-nums text-[var(--text3)]">{time}</p>

      {/* status label setelah card hilang */}
      <AnimatePresence>
        {!showCard && cardStatus !== "idle" && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="ml-10 text-[11px] text-[var(--text3)]"
          >
            {cardStatus === "done" ? "✓ Sudah diingatkan" : "⏰ Ditunda"}
          </motion.p>
        )}
      </AnimatePresence>

      {/* card pengingat */}
      <AnimatePresence>
        {showCard && (
          <motion.div
            className="w-full flex justify-center my-2"
            initial={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <div
              id={cardId}
              className="w-full max-w-[340px] rounded-3xl p-5 shadow-xl"
              style={{
                background: "linear-gradient(145deg, #2c2508, #1f1a00)",
                border: "1px solid rgba(250, 204, 21, 0.15)",
              }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-[var(--accent)]">
                  <FiBell size={22} className="text-[var(--bg)]" />
                </div>
                <p className="text-xs uppercase tracking-widest font-medium text-[var(--accent)]">
                  PENGINGAT
                </p>
              </div>

              <p className="text-[15px] leading-relaxed text-[var(--text)] mb-6">
                {reminderText}
              </p>

              <div className="flex gap-3">
                <button
                  onClick={handleDone}
                  className="flex-1 py-3 rounded-2xl font-semibold text-sm bg-[var(--accent)] text-[var(--bg)] active:scale-[0.97]"
                >
                  Selesai
                </button>
                <button
                  onClick={handleSnooze}
                  className="flex-1 py-3 rounded-2xl font-semibold text-sm text-[var(--text)]"
                  style={{ border: "1px solid rgba(250, 204, 21, 0.3)" }}
                >
                  Tunda
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}