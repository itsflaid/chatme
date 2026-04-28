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
  const allowed = ["isDone", "isPinned", "remindAt", "isRemindDone", "remindSnoozeAt"]
  const data = Object.fromEntries(
    Object.entries(body).filter(([key]) => allowed.includes(key))
  )

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

  await prisma.message.delete({ where: { id } })

  return NextResponse.json({ success: true })
}