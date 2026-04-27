// Layout utama — sidebar kiri permanen di desktop
// Konten kanan berubah sesuai route (page.tsx atau room/[id]/page.tsx)
// Di mobile sidebar full width, tidak ada split

import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Topbar from "@/components/TopBar"
import SearchBar from "@/components/SearchBar"
import RoomList from "@/components/RoomList"
import AddRoomButton from "@/components/AddRoomButton"

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const rooms = await prisma.room.findMany({
    where: { userId: session.user.id! },
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
    <div className="h-screen flex overflow-hidden bg-[var(--bg)]">

      <div
        className=" relative w-full md:w-80 flex flex-col flex-shrink-0 md:border-r border-[var(--border)]"
      >
        <Topbar userName={session.user.name} />
        <SearchBar />
        <RoomList rooms={rooms} />
        <AddRoomButton />
      </div>

      <div className="hidden md:flex flex-1 flex-col overflow-hidden">
        {children}
      </div>

    </div>
  )
}