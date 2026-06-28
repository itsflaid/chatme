import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Topbar from "@/components/sidebar/TopBar"
import SearchBar from "@/components/sidebar/SearchBar"
import SidebarWrapper from "@/components/sidebar/SidebarWrapper"
import AddRoomButton from "@/components/sidebar/AddRoomButton"
import MobileLayout from "@/components/layouts/MobileLayout"

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const sidebar = (
    <>
      <Topbar userName={session.user.name} />
      <SearchBar />
      <SidebarWrapper />
      <AddRoomButton />
    </>
  )

  return (
    <MobileLayout sidebar={sidebar}>
      {children}
    </MobileLayout>
  )
}
