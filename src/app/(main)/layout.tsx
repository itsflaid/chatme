import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getRoomsForUser } from "@/server/services/rooms"
import Topbar from "@/components/sidebar/TopBar"
import SearchBar from "@/components/sidebar/SearchBar"
import SidebarWrapper from "@/components/sidebar/SidebarWrapper"
import AddRoomButton from "@/components/sidebar/AddRoomButton"
import MobileLayout from "@/components/layouts/MobileLayout"

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const rawRooms = await getRoomsForUser(prisma, session.user.id!)

  const rooms = rawRooms.map((r) => ({
    id: r.id,
    name: r.name,
    icon: r.icon,
    description: r.description,
    userId: r.userId,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    _count: r._count,
    messages: r.messages.map((m) => ({
      text: m.text,
      createdAt: m.createdAt.toISOString(),
    })),
  }))

  const sidebar = (
    <>
      <Topbar userName={session.user.name} />
      <SearchBar />
      <SidebarWrapper serverRooms={rooms} />
      <AddRoomButton />
    </>
  )

  return (
    <MobileLayout sidebar={sidebar}>
      {children}
    </MobileLayout>
  )
}