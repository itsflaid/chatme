import { z } from "zod"
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs"
import { prisma } from "@/lib/prisma"
import { sendPushToUser } from "@/lib/webPush"
import { qstashClient } from "@/lib/qstash"
import { encryptField } from "@/lib/encryption"
import {
  NAG_DELAY_MS,
  RETRY_DELAY_SECONDS,
  MIN_RENOTIFY_GAP_MS,
  REMINDER_TRIGGER_URL,
} from "@/lib/reminderScheduler"

const payloadSchema = z.object({
  messageId: z.string(),
  version: z.number(),
  // "fire": penembakan awal (atau retry-nya). "nag": satu-satunya susulan kalau belum
  // di-acknowledge. Beda kind ini yang nentuin boleh retry pas claim gagal, dan boleh
  // njadwalin nag berikutnya pas berhasil.
  kind: z.enum(["fire", "nag"]).default("fire"),
  isRetry: z.boolean().optional().default(false),
})

// Jadwalkan SATU KALI nag susulan kalau reminder ini belum di-acknowledge user setelah
// dikirim. Ganti mekanisme lama yang ngulang tiap REMINDER_REPEAT_MINUTES tanpa batas.
async function scheduleNag(messageId: string, version: number) {
  try {
    const res = await qstashClient.publishJSON({
      url: REMINDER_TRIGGER_URL,
      body: { messageId, version, kind: "nag" as const },
      delay: Math.ceil(NAG_DELAY_MS / 1000),
    })
    await prisma.message.update({
      where: { id: messageId },
      data: { remindQstashId: res.messageId },
    })
  } catch (err) {
    console.error("[reminders/trigger] gagal menjadwalkan nag", messageId, err)
  }
}

// Retry pendek SEKALI kalau claim gagal karena job ini nembak dikit lebih awal dari
// remindAt (race pembulatan delay). Dibatasi cuma 1x lewat flag isRetry biar gak jadi
// loop kalau skip-nya ternyata emang karena alasan lain (udah dibatalkan / diselesaikan /
// di-reschedule) — kasus itu ditangani oleh pengecekan justTooEarly di bawah, jadi retry
// cuma kepanggil kalau memang kelihatan seperti race timing, bukan skip yang legit.
async function scheduleRetry(messageId: string, version: number) {
  try {
    await qstashClient.publishJSON({
      url: REMINDER_TRIGGER_URL,
      body: { messageId, version, kind: "fire" as const, isRetry: true },
      delay: RETRY_DELAY_SECONDS,
    })
  } catch (err) {
    console.error("[reminders/trigger] gagal menjadwalkan retry", messageId, err)
  }
}

async function handler(req: Request) {
  const body = payloadSchema.parse(await req.json())
  const now = new Date()
  const cutoff = new Date(now.getTime() - MIN_RENOTIFY_GAP_MS)

  // Klaim atomik: cuma eksekusi yang berhasil nge-update baris ini yang lanjut ngirim
  // push. Ini yang bikin endpoint idempotent terhadap QStash retry / concurrent execution,
  // dan otomatis nge-skip job basi — reminder yang udah di-reschedule (reminderVersion
  // beda), ditandai selesai, dihapus, atau belum waktunya (remindAt > now) gak akan lolos.
  const claim = await prisma.message.updateMany({
    where: {
      id: body.messageId,
      isBot: false,
      isRemindDone: false,
      reminderVersion: body.version,
      remindAt: { lte: now },
      OR: [{ remindNotifiedAt: null }, { remindNotifiedAt: { lte: cutoff } }],
    },
    data: { remindNotifiedAt: now },
  })

  if (claim.count === 0) {
    // Kalau ini penembakan awal (bukan hasil retry sebelumnya) DAN reminder-nya masih ada,
    // masih pending, versi masih cocok, tapi remindAt-nya masih di masa depan — kemungkinan
    // besar ini race pembulatan delay (job nembak dikit lebih awal). Coba sekali lagi
    // sebentar lagi. Kalau skip-nya karena alasan lain (udah selesai / versi beda / gak
    // ketemu), justTooEarly bakal false dan kita diem aja, sesuai perilaku lama.
    if (body.kind === "fire" && !body.isRetry) {
      const current = await prisma.message.findUnique({ where: { id: body.messageId } })
      const justTooEarly =
        current &&
        !current.isBot &&
        !current.isRemindDone &&
        current.reminderVersion === body.version &&
        current.remindAt !== null &&
        current.remindAt.getTime() > now.getTime()
      if (justTooEarly) {
        await scheduleRetry(body.messageId, body.version)
      }
    }
    return Response.json({ skipped: true })
  }

  const reminder = await prisma.message.findUniqueOrThrow({ where: { id: body.messageId } })
  // reminder.text di sini SUDAH plaintext (auto-decrypt lewat extension di src/lib/prisma.ts) —
  // aman dipakai langsung buat body push, tapi HARUS dienkripsi ulang sebelum ditulis lagi
  // ke DB sebagai row baru (bot bubble) di bawah, kalau enggak bakal kesimpan plaintext.

  // Jadwalin nag susulan DULUAN, sebelum kirim push — supaya kalau pengiriman push gagal
  // (mis. layanan push lagi down), reminder tetap dapat 1 kesempatan lagi, bukan diam
  // selamanya. Cuma dijadwalin kalau ini penembakan "fire" — kalau yang lagi jalan ini
  // si nag itu sendiri, jangan jadwalin apa-apa lagi, nagging berhenti di sini.
  if (body.kind === "fire") {
    await scheduleNag(reminder.id, reminder.reminderVersion)
  }

  // Bikin bot bubble kalau belum ada. Unique constraint di sourceMessageId + skipDuplicates
  // mencegah duplikat kalau somehow job ini kepanggil lebih dari sekali.
  await prisma.message.createMany({
    data: [
      {
        text: encryptField(reminder.text),
        isBot: true,
        sourceMessageId: reminder.id,
        roomId: reminder.roomId,
        userId: reminder.userId,
      },
    ],
    skipDuplicates: true,
  })

  await sendPushToUser(prisma, reminder.userId, {
    id: reminder.id,
    title: "Pengingat Chatme",
    body: reminder.text || "Ada pengingat yang perlu kamu cek.",
    url: `/room/${reminder.roomId}`,
    tag: `chatme-reminder-${reminder.id}`,
  })

  return Response.json({ ok: true })
}

// Sama seperti /api/cron/check-reminders: request wajib ditandatangani QStash.
export const POST = verifySignatureAppRouter(handler)