"use client";

import { useRouter } from "next/navigation";
import { FiArrowLeft, FiMoreVertical } from "react-icons/fi";
import { IoSearch, IoNotificationsOutline } from "react-icons/io5";

type Props = {
  name: string;
  icon: string;
  messageCount: number;
  pendingCount: number;
};

export default function ChatHeader({
  name,
  icon,
  messageCount,
  pendingCount,
}: Props) {
  const router = useRouter();

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b bg-[var(--surface)] border-[var(--border)]">
      
      {/* LEFT */}
      <div className="flex items-center gap-3 min-w-0">
        
        <button
          onClick={() => router.back()}
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

      {/* CENTER (Search lebih proper) */}
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

      {/* RIGHT */}
      <div className="flex items-center gap-1 flex-shrink-0">
        
        <button className="p-2 rounded-full hover:bg-[var(--surface2)] transition">
          <IoNotificationsOutline size={18} className="text-[var(--text2)]" />
        </button>

        <button className="p-2 rounded-full hover:bg-[var(--surface2)] transition text-[var(--text2)]">
          <FiMoreVertical size={18} />
        </button>
      </div>
    </div>
  );
}