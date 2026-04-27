import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Topbar from "@/components/TopBar"
import SearchBar from "@/components/SearchBar"
import RoomList from "@/components/RoomList"
import AddRoomButton from "@/components/AddRoomButton"

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

      {/* sidebar / full mobile */}
      <div
        className="w-full md:w-80 flex flex-col flex-shrink-0 md:border-r"
        style={{ borderColor: "var(--border)" }}
      >
        <Topbar userName={session.user.name} />
        <SearchBar />
        <RoomList rooms={rooms} />
        <AddRoomButton />
      </div>

      {/* area kanan desktop */}
      <div
        className="hidden md:flex flex-1 items-center justify-center"
        style={{ background: "var(--bg)" }}
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-sm font-semibold font-sora" style={{ color: "var(--text)" }}>
            Pilih room untuk mulai
          </p>
          <p className="text-xs" style={{ color: "var(--text3)" }}>
            atau buat room baru
          </p>
        </div>
      </div>

    </div>
  )
}