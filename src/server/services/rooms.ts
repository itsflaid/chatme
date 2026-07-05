import { PrismaClient } from "@prisma/client"

export async function getRoomsForUser(prisma: PrismaClient, userId: string) {
  const rawRooms = await prisma.room.findMany({
    where: { userId },
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

  return rawRooms.sort((a, b) => {
    const aActivity = a.messages[0]?.createdAt ?? a.createdAt
    const bActivity = b.messages[0]?.createdAt ?? b.createdAt
    return bActivity.getTime() - aActivity.getTime()
  })
}
