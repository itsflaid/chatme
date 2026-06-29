import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

type Props = {
  params: Promise<{ id: string }>
}

export async function GET(req: Request, { params }: Props) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const userId = session.user.id!

  const room = await prisma.room.findFirst({ where: { id, userId } })
  if (!room) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const url = new URL(req.url)
  const before = url.searchParams.get("before")
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "30", 10), 100)

  const where: Record<string, unknown> = { roomId: id }
  if (before) {
    const cursor = await prisma.message.findUnique({
      where: { id: before },
      select: { createdAt: true },
    })
    if (cursor) {
      where.createdAt = { lt: cursor.createdAt }
    }
  }

  const messages = await prisma.message.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    include: {
      checklistItems: { orderBy: { position: "asc" } },
    },
  })

  const hasMore = messages.length > limit
  if (hasMore) messages.pop()

  messages.reverse()

  return NextResponse.json({ messages, hasMore })
}
