import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

type Props = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Props) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const userId = session.user.id!

  const pendingReminders = await prisma.message.findMany({
    where: {
      roomId: id,
      isBot: false,
      isRemindDone: false,
      remindAt: { lte: new Date() },
      reminders: { none: {} }
    }
  })

  if (pendingReminders.length === 0) {
    return NextResponse.json([])
  }

  await prisma.message.createMany({
    data: pendingReminders.map(reminder => ({
      text: "", // 🔥 kosong aja gapapa (UI ga pake ini)
      isBot: true,
      sourceMessageId: reminder.id,
      roomId: id,
      userId,
    }))
  })

  const newBotMessages = await prisma.message.findMany({
    where: {
      roomId: id,
      isBot: true,
      sourceMessageId: { in: pendingReminders.map(r => r.id) }
    },
    include: {
      sourceMessage: true // 🔥 penting!
    },
    orderBy: { createdAt: "asc" }
  })

  return NextResponse.json(newBotMessages)
}