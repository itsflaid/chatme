import { auth } from "@/auth"
import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import RoomWrapper from "@/components/chat/RoomWrapper"

type Props = {
  params: Promise<{ id: string }>
}

export default async function RoomPage({ params }: Props) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) redirect("/login")
  const userId = session.user!.id!

  const room = await prisma.room.findFirst({
    where: { id, userId },
  })
  if (!room) notFound()

  return (
    <div className="flex flex-col" style={{ background: "var(--bg)", height: "100dvh" }}>
      <RoomWrapper
        roomId={id}
        userId={userId}
        room={room}
      />
    </div>
  )
}
