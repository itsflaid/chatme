import webpush from "web-push"
import type { PrismaClientExtended } from "./prisma"

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

type PushPayload = {
  id: string
  title: string
  body: string
  url?: string
  tag?: string
}

export async function sendPushToUser(prisma: PrismaClientExtended, userId: string, payload: PushPayload) {
  const subs = await prisma.pushSubscription.findMany({ where: { userId } })

  if (subs.length === 0) {
    console.warn("[webpush] gak ada push subscription buat user", userId)
    return
  }

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload),
          { urgency: "high", TTL: 300 }
        )
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode
        const body = (err as { body?: string }).body
        if (statusCode === 404 || statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {})
        } else {
          console.error("[webpush] gagal kirim ke", sub.endpoint, "status:", statusCode, "body:", body, err)
        }
      }
    })
  )
}
