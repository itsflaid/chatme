// API POST /api/rooms
// Validasi session → buat room di DB → return data room

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

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