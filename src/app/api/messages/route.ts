import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { MessageType } from "@prisma/client"

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { roomId, text, type = MessageType.TEXT, items } = await req.json()
  if (!roomId || !text) return NextResponse.json({ error: "Missing fields" }, { status: 400 })

  const room = await prisma.room.findFirst({
    where: { id: roomId, userId: session.user.id! },
    select: { id: true },
  })
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 })

  const normalizedItems = Array.isArray(items)
    ? items
        .map((item) => String(item).trim())
        .filter(Boolean)
        .slice(0, 20)
    : []

  if (type === MessageType.CHECKLIST && normalizedItems.length < 2) {
    return NextResponse.json(
      { error: "Checklist membutuhkan minimal 2 item" },
      { status: 400 }
    )
  }

  const message = await prisma.message.create({
    data: {
      text: String(text).trim(),
      type: type === MessageType.CHECKLIST ? MessageType.CHECKLIST : MessageType.TEXT,
      roomId,
      userId: session.user.id!,
      ...(type === MessageType.CHECKLIST && {
        checklistItems: {
          create: normalizedItems.map((item, position) => ({
            text: item,
            position,
          })),
        },
      }),
    },
    include: {
      checklistItems: {
        orderBy: { position: "asc" },
      },
    },
  })

  return NextResponse.json(message)
}
