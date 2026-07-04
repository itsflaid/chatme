import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Topbar from "@/components/sidebar/TopBar"
import SearchBar from "@/components/sidebar/SearchBar"
import SidebarWrapper from "@/components/sidebar/SidebarWrapper"
import AddRoomButton from "@/components/sidebar/AddRoomButton"
import MobileLayout from "@/components/layouts/MobileLayout"

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  // Fetch rooms server-side — eliminasi 1 client round-trip
  const rawRooms = await prisma.room.findMany({
    where: { userId: session.user.id! },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: {
        select: {
          messages: { where: { isDone: false, isBot: false } },
        },
      },
      messages: {
        where: { isBot: false },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { text: true, createdAt: true },
      },
    },
  })

  const rooms = rawRooms
    .map((r) => ({
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
    .sort((a, b) => {
      const aActivity = a.messages[0]?.createdAt ?? a.updatedAt
      const bActivity = b.messages[0]?.createdAt ?? b.updatedAt
      return bActivity.localeCompare(aActivity)
    })

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