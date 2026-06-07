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
  const { isDone } = await req.json()

  if (typeof isDone !== "boolean") {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 })
  }

  const item = await prisma.checklistItem.findFirst({
    where: {
      id,
      message: { userId: session.user.id! },
    },
    select: { id: true },
  })
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.checklistItem.update({
      where: { id },
      data: { isDone },
    })

    const remaining = await tx.checklistItem.count({
      where: {
        messageId: updated.messageId,
        isDone: false,
      },
    })

    await tx.message.update({
      where: { id: updated.messageId },
      data: { isDone: remaining === 0 },
    })

    return {
      item: updated,
      messageIsDone: remaining === 0,
    }
  })

  return NextResponse.json(result)
}
