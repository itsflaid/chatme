import type { PrismaClientExtended } from "@/lib/prisma"

//ambil daftar room utk sidebar (preview pesan terakhir + jumlah pending)
export async function getRoomsForUser(prisma: PrismaClientExtended, userId: string) {
  const rawRooms = await prisma.room.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: {
        select: {
          messages: { where: { taskStatus: "PENDING", isBot: false, type: { not: "CHECKLIST" } } },
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