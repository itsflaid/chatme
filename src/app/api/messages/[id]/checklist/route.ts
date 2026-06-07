import { MessageType } from "@prisma/client"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

type Props = {
  params: Promise<{ id: string }>
}

export async function PATCH(req: Request, { params }: Props) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const { title, items } = await req.json()
  const normalizedTitle = String(title ?? "").trim()
  const normalizedItems = Array.isArray(items)
    ? items
        .map((item) => ({
          text: String(item?.text ?? "").trim(),
          isDone: Boolean(item?.isDone),
        }))
        .filter((item) => item.text)
        .slice(0, 20)
    : []

  if (!normalizedTitle || normalizedItems.length < 2) {
    return NextResponse.json(
      { error: "Judul dan minimal 2 item wajib diisi" },
      { status: 400 }
    )
  }

  const message = await prisma.message.findFirst({
    where: {
      id,
      userId: session.user.id!,
      type: MessageType.CHECKLIST,
    },
    select: { id: true },
  })
  if (!message) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const updated = await prisma.$transaction(async (tx) => {
    await tx.checklistItem.deleteMany({ where: { messageId: id } })
    await tx.message.update({
      where: { id },
      data: {
        text: normalizedTitle,
        isDone: normalizedItems.every((item) => item.isDone),
        checklistItems: {
          create: normalizedItems.map((item, position) => ({
            ...item,
            position,
          })),
        },
      },
    })

    return tx.message.findUniqueOrThrow({
      where: { id },
      include: {
        checklistItems: {
          orderBy: { position: "asc" },
        },
      },
    })
  })

  return NextResponse.json(updated)
}
