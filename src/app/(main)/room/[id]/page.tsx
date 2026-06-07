export const dynamic = "force-dynamic"

import { auth } from "@/auth"
import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import ChatContainer from "@/components/chat/ChatContainer"

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

  // cek + buat bot message dulu
  const pendingReminders = await prisma.message.findMany({
    where: {
      roomId: id,
      isBot: false,
      isRemindDone: false,
      remindAt: { lte: new Date() },
      reminders: { none: {} }
    }
  })

  if (pendingReminders.length > 0) {
    await prisma.message.createMany({
      data: pendingReminders.map(reminder => ({
        text: "Hei! Kamu punya pengingat yang perlu diperhatikan 🔔",
        isBot: true,
        sourceMessageId: reminder.id,
        roomId: id,
        userId,
      }))
    })
  }

  // fetch semua messages — sudah include bot message baru
  const messages = await prisma.message.findMany({
    where: { roomId: id },
    orderBy: { createdAt: "asc" },
    include: {
      checklistItems: {
        orderBy: { position: "asc" },
      },
    },
  })

  return (
    <div className="flex flex-col" style={{ background: "var(--bg)", height: "100dvh" }}>
      <ChatContainer
        messages={messages}
        room={room}
        userId={userId}
      />
    </div>
  )
}
