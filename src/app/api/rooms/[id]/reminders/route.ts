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
      userId,
      isBot: false,
      isRemindDone: false,
      remindAt: { lte: new Date() },
      reminders: { none: {} },
    },
  })

  if (pendingReminders.length === 0) {
    return NextResponse.json([])
  }

  await prisma.message.createMany({
    data: pendingReminders.map((reminder) => ({
      text: "",
      isBot: true,
      sourceMessageId: reminder.id,
      roomId: id,
      userId,
    })),
  })

  const newBotMessages = await prisma.message.findMany({
    where: {
      roomId: id,
      userId,
      isBot: true,
      sourceMessageId: { in: pendingReminders.map((reminder) => reminder.id) },
    },
    include: {
      sourceMessage: true,
      checklistItems: {
        orderBy: { position: "asc" },
      },
    },
    orderBy: { createdAt: "asc" },
  })

  return NextResponse.json(newBotMessages)
}
