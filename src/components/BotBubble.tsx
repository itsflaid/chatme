"use client"

import { useEffect } from "react"
import { Message } from "@prisma/client"
import { FiBell } from "react-icons/fi"

type Props = {
  message: Message
  sourceMessage?: Message | null
  onDone: () => void
  onSnooze: () => void
}

export default function BotBubble({ message, sourceMessage, onDone, onSnooze }: Props) {
  const time = new Date(message.createdAt).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  })

  const reminderText = sourceMessage?.text ?? message.text ?? "Tidak ada teks pengingat"
  const cardId = `bot-card-${message.id}`

  // animasi getar tiap 5 detik
  useEffect(() => {
    const el = document.getElementById(cardId)
    if (!el) return

    const shake = () => {
      el.classList.add("animate-shake")
      setTimeout(() => el.classList.remove("animate-shake"), 600)
    }

    shake() // langsung getar saat muncul
    const interval = setInterval(shake, 5000)
    return () => clearInterval(interval)
  }, [cardId])

  return (
    <div className="flex flex-col items-start gap-1 my-2">
      <div className="flex items-end gap-2">
        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mb-1 bg-[var(--surface2)] border border-[var(--border)]">
          <FiBell size={16} className="text-[var(--accent)]" />
        </div>
        <div
          className="rounded-[18px_18px_18px_4px] px-4 py-2.5 max-w-[70%]"
          style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
        >
          <p className="text-sm leading-relaxed text-[var(--text)]">
            Hei! Kamu punya pengingat yang perlu diperhatikan 🔔
          </p>
        </div>
      </div>

      <p className="ml-10 text-[10px] tabular-nums text-[var(--text3)]">{time}</p>

      <div className="w-full flex justify-center my-2">
        <div
          id={cardId}
          className="w-full max-w-[340px] rounded-3xl p-5 shadow-xl"
          style={{
            background: "linear-gradient(145deg, #2c2508, #1f1a00)",
            border: "1px solid rgba(250, 204, 21, 0.15)",
          }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 bg-[var(--accent)]">
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
              onClick={onDone}
              className="flex-1 py-3 rounded-2xl font-semibold text-sm transition-all active:scale-[0.97] hover:brightness-110 bg-[var(--accent)] text-[var(--bg)]"
            >
              Selesai
            </button>
            <button
              onClick={onSnooze}
              className="flex-1 py-3 rounded-2xl font-semibold text-sm transition-all active:scale-[0.97] text-[var(--text)]"
              style={{ border: "1px solid rgba(250, 204, 21, 0.3)" }}
            >
              Tunda
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}