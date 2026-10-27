import { cookies } from "next/headers"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getRoomsForUser } from "@/server/services/rooms"
import { SIDEBAR_COLLAPSED, SIDEBAR_COOKIE } from "@/lib/sidebarCookie"
import Topbar from "@/components/sidebar/TopBar"
import SidebarSection from "@/components/sidebar/SidebarSection"
import AddRoomButton from "@/components/sidebar/AddRoomButton"
import MobileLayout from "@/components/layouts/MobileLayout"
import { SidebarCollapseRoot } from "@/components/layouts/SidebarCollapse"

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const cookieStore = await cookies()
  const defaultSidebarCollapsed = cookieStore.get(SIDEBAR_COOKIE)?.value === SIDEBAR_COLLAPSED

  const rawRooms = await getRoomsForUser(prisma, session.user.id!)

  const rooms = rawRooms.map((r) => ({
    id: r.id,
    name: r.name,
    icon: r.icon,
    description: r.description,
    isPinned: r.isPinned,
    pinnedAt: r.pinnedAt?.toISOString() ?? null,
    isArchived: r.isArchived,
    archivedAt: r.archivedAt?.toISOString() ?? null,
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
      <Topbar userName={session.user.name} userImage={session.user.image} userEmail={session.user.email} />
      <SidebarSection serverRooms={rooms} />
      <AddRoomButton />
    </>
  )

  return (
    <SidebarCollapseRoot defaultCollapsed={defaultSidebarCollapsed}>
      <MobileLayout sidebar={sidebar}>
        {children}
      </MobileLayout>
    </SidebarCollapseRoot>
  )
}