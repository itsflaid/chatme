import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Topbar from "@/components/sidebar/TopBar"
import SearchBar from "@/components/sidebar/SearchBar"
import RoomList from "@/components/sidebar/RoomList"
import AddRoomButton from "@/components/sidebar/AddRoomButton"
import MobileLayout from "@/components/layouts/MobileLayout"

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const rooms = await prisma.room.findMany({
    where: { userId: session.user.id! },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: {
        select: {
          messages: { where: { isDone: false, isBot: false } }
        }
      },
      messages: {
        where: {isBot: false},
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { text: true, createdAt: true }
      }
    }
  })

  rooms.sort((a, b) => {
    const aActivity = a.messages[0]?.createdAt ?? a.createdAt
    const bActivity = b.messages[0]?.createdAt ?? b.createdAt
    return bActivity.getTime() - aActivity.getTime()
  })

  const sidebar = (
    <>
      <Topbar userName={session.user.name} />
      <SearchBar />
      <RoomList rooms={rooms} />
      <AddRoomButton />
    </>
  )

  return (
    <MobileLayout sidebar={sidebar}>
      {children}
    </MobileLayout>
  )
}
