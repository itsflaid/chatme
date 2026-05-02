import { auth } from "@/auth"
import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import ChatContainer from "@/components/chat/ChatContainer"
import ChatInput from "@/components/chat/ChatInput"

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

  const pendingReminders = await prisma.message.findMany({
    where: {
      roomId: id,
      isBot: false,
      isRemindDone: false,
      remindAt: { lte: new Date() },
      // reminders: { none: {} }
    }
  })

  for (const reminder of pendingReminders) {
  const existing = await prisma.message.findFirst({
    where: {
      sourceMessageId: reminder.id,
      isBot: true,
    },
  })

  if (!existing) {
    await prisma.message.create({
  data: {
    text: "🔔 Pengingat",
    isBot: true,
    sourceMessageId: reminder.id,
    roomId: id,
    userId,
  },
})
  }
}

  const messages = await prisma.message.findMany({
    where: { roomId: id },
    orderBy: { createdAt: "asc" },
  })

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--bg)" }}>
      <ChatContainer messages={messages} room={room} />
      <ChatInput roomId={id} />
    </div>
  )
}