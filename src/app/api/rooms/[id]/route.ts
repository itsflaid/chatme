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
  const { name, icon, description } = await req.json()

  // pastiin room milik user ini
  const room = await prisma.room.findFirst({
    where: { id, userId: session.user!.id! }
  })
  if (!room) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const updated = await prisma.room.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(icon && { icon }),
      description: description ?? room.description,
    }
  })

  return NextResponse.json(updated)
}

export async function DELETE(_req: Request, { params }: Props) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  const room = await prisma.room.findFirst({
    where: { id, userId: session.user!.id! }
  })
  if (!room) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await prisma.room.delete({ where: { id } })

  return NextResponse.json({ success: true })
}