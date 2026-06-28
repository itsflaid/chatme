import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const rooms = await prisma.room.findMany({
    where: { userId: session.user.id! },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: {
        select: {
          messages: { where: { isDone: false, isBot: false } },
        },
      },
      messages: {
        where: { isBot: false },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { text: true, createdAt: true },
      },
    },
  })

  rooms.sort((a, b) => {
    const aActivity = a.messages[0]?.createdAt ?? a.createdAt
    const bActivity = b.messages[0]?.createdAt ?? b.createdAt
    return bActivity.getTime() - aActivity.getTime()
  })

  return NextResponse.json({ rooms })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { name, icon, description } = await req.json()
  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 })

  const room = await prisma.room.create({
    data: {
      name,
      icon: icon || "💬",
      description: description || null,
      userId: session.user.id!,
    },
  })

  return NextResponse.json(room)
}