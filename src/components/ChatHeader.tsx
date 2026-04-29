"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FiArrowLeft, FiMoreVertical, FiX, FiCheck } from "react-icons/fi";
import { IoSearch, IoNotificationsOutline } from "react-icons/io5";
import { Message } from "@prisma/client";
import { motion, AnimatePresence } from "framer-motion";

type Props = {
  name: string;
  icon: string;
  messageCount: number;
  pendingCount: number;
  reminders: Message[];
  onReminderDone: (messageId: string) => void;
};

export default function ChatHeader({
  name,
  icon,
  messageCount,
  pendingCount,
  reminders,
  onReminderDone,
}: Props) {
  const router = useRouter();
  const [showReminders, setShowReminders] = useState(false);

  return (
    <>
      {/* Header Utama */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-[var(--surface)] border-[var(--border)]">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => router.push("/")}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--surface2)] transition text-[var(--accent)]"
          >
            <FiArrowLeft size={20} />
          </button>

          <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg border flex-shrink-0 bg-[var(--surface2)] border-[var(--border2)]">
            {icon}
          </div>

          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold truncate text-[var(--text)]">
              {name}
            </span>
            <span className="text-xs text-[var(--text3)] truncate">
              {pendingCount} reminder · {messageCount} pesan
            </span>
          </div>
        </div>

        <div className="flex-1 flex justify-center px-2">
          <div className="relative w-full max-w-xs">
            <IoSearch
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text3)]"
            />
            <input
              type="text"
              placeholder="Cari pesan..."
              className="w-full pl-9 pr-3 py-1.5 text-sm rounded-full bg-[var(--surface2)] text-[var(--text)] placeholder:text-[var(--text3)] outline-none focus:ring-1 focus:ring-[var(--accent)] transition"
            />
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => setShowReminders(true)}
            className="relative p-2 rounded-full hover:bg-[var(--surface2)] transition"
          >
            <IoNotificationsOutline size={18} className="text-[var(--text2)]" />
            {reminders.length > 0 && (
              <span
                className="absolute top-1 right-1 w-4 h-4 rounded-full text-[10px] font-bold font-sora flex items-center justify-center"
                style={{ background: "var(--accent)", color: "var(--bg)" }}
              >
                {reminders.length}
              </span>
            )}
          </button>

          <button className="p-2 rounded-full hover:bg-[var(--surface2)] transition text-[var(--text2)]">
            <FiMoreVertical size={18} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showReminders && (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center"
            style={{ background: "#00000070", backdropFilter: "blur(4px)" }}
            onClick={(e) => e.target === e.currentTarget && setShowReminders(false)}
          >
            <motion.div
              className="w-full max-w-md rounded-t-3xl p-6 pb-10"
              style={{ 
                background: "var(--surface)", 
                borderTop: "1px solid var(--border2)" 
              }}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ 
                type: "spring", 
                stiffness: 300, 
                damping: 30 
              }}
            >
              <div className="w-9 h-1 rounded-full mx-auto mb-5 bg-[var(--border2)]" />

              <div className="flex items-center justify-between mb-4">
                <p className="font-semibold font-sora text-sm text-[var(--text)]">
                  Reminder Aktif
                </p>
                <button 
                  onClick={() => setShowReminders(false)} 
                  className="text-[var(--text3)] hover:text-[var(--text)] transition"
                >
                  <FiX size={18} />
                </button>
              </div>

              {reminders.length === 0 ? (
                <p className="text-sm text-center py-6 text-[var(--text3)]">
                  Tidak ada reminder aktif
                </p>
              ) : (
                <div className="flex flex-col gap-3 max-h-80 overflow-y-auto">
                  {reminders.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center gap-3 p-3 rounded-xl border"
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
                              minute: "2-digit"
                            })}
                          </p>
                        )}
                      </div>

                      <button
                        onClick={() => {
                          onReminderDone(r.id);
                          setShowReminders(false);
                        }}
                        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all hover:scale-110 active:scale-95"
                        style={{ background: "var(--accent)", color: "var(--bg)" }}
                      >
                        <FiCheck size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}