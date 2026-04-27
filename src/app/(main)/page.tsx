import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { FiSearch, FiPlus } from "react-icons/fi"
import { HiOutlineChatBubbleLeftRight } from "react-icons/hi2"

export default async function HomePage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const rooms = await prisma.room.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: {
        select: {
          messages: { where: { isDone: false } }
        }
      }
    }
  })

  return (
    <div className="min-h-screen flex" style={{ background: "var(--bg)" }}>

      {/* ── SIDEBAR ── */}
      <div className="w-full md:w-[350px] flex flex-col flex-shrink-0 md:border-r" style={{ borderColor: "var(--border)" }}>

        {/* topbar */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <h1 className="text-lg font-bold font-sora" style={{ color: "var(--text)" }}>Chatme</h1>
          <div className="flex items-center gap-2">
            <button className="w-8 h-8 rounded-full flex items-center justify-center transition-colors" style={{ color: "var(--text3)" }}>
              <FiSearch size={16} />
            </button>
            <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs font-sora" style={{ background: "var(--accent)", color: "var(--bg)" }}>
              {session.user.name?.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>

        {/* search */}
        <div className="px-4 py-3 border-b" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2 rounded-xl px-3 py-2 border" style={{ background: "var(--surface2)", borderColor: "var(--border)" }}>
            <FiSearch size={14} style={{ color: "var(--text3)" }} className="flex-shrink-0" />
            <input
              className="flex-1 bg-transparent text-sm outline-none"
              style={{ color: "var(--text)" }}
              placeholder="Cari pesan atau room..."
            />
          </div>
        </div>

        {/* room list */}
        <div className="flex-1 overflow-y-auto" style={{ background: "var(--bg)" }}>
          {rooms.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-24 px-8 text-center">
              <div className="w-14 h-14 rounded-2xl border flex items-center justify-center" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                <HiOutlineChatBubbleLeftRight size={24} style={{ color: "var(--text3)" }} />
              </div>
              <p className="text-sm font-semibold font-sora" style={{ color: "var(--text)" }}>Belum ada room</p>
              <p className="text-xs leading-relaxed" style={{ color: "var(--text3)" }}>
                Tap tombol + untuk buat room pertamamu
              </p>
            </div>
          ) : (
            rooms.map((room) => (
              
                <a key={room.id}
                href={`/room/${room.id}`}
                className="flex items-center gap-3 px-4 py-3.5 border-b transition-colors cursor-pointer"
                style={{ borderColor: "var(--border)" }}
              >
                <div className="w-11 h-11 rounded-2xl border flex items-center justify-center text-xl flex-shrink-0" style={{ background: "var(--surface2)", borderColor: "var(--border)" }}>
                  {room.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold font-sora truncate" style={{ color: "var(--text)" }}>{room.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text3)" }}>Tap untuk buka</p>
                </div>
                {room._count.messages > 0 && (
                  <div className="text-xs font-bold px-2 py-0.5 rounded-full font-sora flex-shrink-0" style={{ background: "var(--accent)", color: "var(--bg)" }}>
                    {room._count.messages}
                  </div>
                )}
              </a>
            ))
          )}
        </div>

        {/* bottom add room */}
        <div className="p-4 border-t" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <button
            className="w-full flex items-center justify-center gap-2 font-semibold text-sm rounded-xl py-3 transition-colors font-sora"
            style={{ background: "var(--accent)", color: "var(--bg)" }}
          >
            <FiPlus size={18} />
            Buat Room Baru
          </button>
        </div>

      </div>

      {/* ── MAIN CONTENT desktop ── */}
      <div className="hidden md:flex flex-1 items-center justify-center" style={{ background: "var(--bg)" }}>
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-16 h-16 rounded-2xl border flex items-center justify-center" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <HiOutlineChatBubbleLeftRight size={28} style={{ color: "var(--text3)" }} />
          </div>
          <p className="text-sm font-semibold font-sora" style={{ color: "var(--text)" }}>Pilih room untuk mulai</p>
          <p className="text-xs" style={{ color: "var(--text3)" }}>atau buat room baru</p>
        </div>
      </div>

    </div>
  )
}