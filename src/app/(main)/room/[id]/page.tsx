import { auth } from "@/auth"
import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import ChatHeader from "@/components/ChatHeader"
import ChatMessages from "@/components/ChatMessages"
import ChatInput from "@/components/ChatInput"

type Props = {
  params: Promise<{ id: string }>
}

export default async function RoomPage({ params }: Props) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) redirect("/login")

  const room = await prisma.room.findFirst({
    where: { id, userId: session.user.id! },
  })
  if (!room) notFound()

  const messages = await prisma.message.findMany({
    where: { roomId: id },
    orderBy: { createdAt: "asc" },
  })

  const pendingCount = messages.filter((m) => !m.isDone).length

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--bg)" }}>
      <ChatHeader
        name={room.name}
        icon={room.icon}
        messageCount={messages.length}
        pendingCount={pendingCount}
      />
      <ChatMessages messages={messages} />
      <ChatInput roomId={id} />
    </div>
  )
}