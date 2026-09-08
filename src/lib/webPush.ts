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
    // Penyebab paling sering notif "hilang tanpa jejak": trigger jalan normal, bot bubble
    // kebuat, tapi user ini gak punya push subscription tersimpan sama sekali — jadi gak ada
    // yang dikirim, dan sebelumnya gak ada log apapun yang nunjukin ini. Cari baris log ini.
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
          // Subscription sudah expired/dicabut browser — bersihkan dari DB.
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {})
        } else {
          // Status selain 404/410 (mis. 401/403 = VAPID key gak cocok antara server & yang
          // dipakai browser subscribe) TIDAK menghapus subscription — jadi kalau ini
          // penyebabnya, akan gagal diam-diam berulang tiap reminder nembak. statusCode &
          // body di log ini kuncinya buat diagnosa cepat.
          console.error("[webpush] gagal kirim ke", sub.endpoint, "status:", statusCode, "body:", body, err)
        }
      }
    })
  )
}