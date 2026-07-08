import { auth } from "@/auth"
import { redirect } from "next/navigation"
import RoomWrapper from "@/components/chat/RoomWrapper"

type Props = {
  params: Promise<{ id: string }>
}

export default async function RoomPage({ params }: Props) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) redirect("/login")

  return (
    <div className="flex flex-col" style={{ background: "var(--bg)", height: "100dvh" }}>
      <RoomWrapper roomId={id} />
    </div>
  )
}
