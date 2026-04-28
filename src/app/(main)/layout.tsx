import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Topbar from "@/components/TopBar"
import SearchBar from "@/components/SearchBar"
import RoomList from "@/components/RoomList"
import AddRoomButton from "@/components/AddRoomButton"
import MobileLayout from "@/components/MobileLayout"

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