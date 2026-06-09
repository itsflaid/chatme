// PATCH → update field tertentu (isDone, isPinned, remindAt)
// DELETE → hapus pesan

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

type Props = {
  params: Promise<{ id: string }>
}

export async function PATCH(req: Request, { params }: Props) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  // hanya allow field tertentu yang bisa diupdate
  const allowed = ["text", "isDone", "isPinned", "remindAt", "isRemindDone", "remindSnoozeAt"]
  const data = Object.fromEntries(
    Object.entries(body).filter(([key]) => allowed.includes(key))
  )

  if (typeof data.text === "string") {
    data.text = data.text.trim()
    if (!data.text) {
      return NextResponse.json({ error: "Pesan tidak boleh kosong" }, { status: 400 })
    }
    data.editedAt = new Date()
  }

  const ownedMessage = await prisma.message.findFirst({
    where: { id, userId: session.user.id! },
    select: { id: true, isDone: true, type: true },
  })
  if (!ownedMessage) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  if ("text" in data && (ownedMessage.isDone || ownedMessage.type !== "TEXT")) {
    return NextResponse.json(
      { error: "Pesan ini tidak dapat diedit" },
      { status: 400 }
    )
  }

  const message = await prisma.message.update({
    where: { id },
    data,
  })

  return NextResponse.json(message)
}

export async function DELETE(_req: Request, { params }: Props) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  const ownedMessage = await prisma.message.findFirst({
    where: { id, userId: session.user.id! },
    select: { id: true },
  })
  if (!ownedMessage) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  await prisma.message.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
