import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { roomId, text } = await req.json()
  if (!roomId || !text) return NextResponse.json({ error: "Missing fields" }, { status: 400 })

  const message = await prisma.message.create({
    data: {
      text,
      roomId,
      userId: session.user.id!,
    },
  })

  return NextResponse.json(message)
}