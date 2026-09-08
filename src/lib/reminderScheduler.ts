import type { Message } from "@prisma/client"
import type { PrismaClientExtended } from "./prisma"
import { qstashClient, getAppUrl } from "./qstash"

// Reminder yang udah terkirim tapi belum di-acknowledge user dinaggin ULANG SATU KALI
// setelah interval ini, abis itu berhenti — ganti dari mekanisme lama yang ngulang tiap
// REMINDER_REPEAT_MINUTES tanpa batas selama belum ditandai selesai.
export const NAG_DELAY_MS = (Number(process.env.REMINDER_NAG_MINUTES) || 15) * 60 * 1000

// Kalau claim pertama gagal karena job ini kepanggil dikit lebih awal dari remindAt (race
// pembulatan delay), coba ulang sekali lagi setelah jeda pendek ini sebelum nyerah diam-diam.
export const RETRY_DELAY_SECONDS = 5

// Jendela minimum antar notifikasi buat reminder yang sama — jaga-jaga kalau QStash ngirim
// job yang sama dua kali (mis. retry transport-level tanpa kita gagal beneran). Sengaja jauh
// lebih pendek dari NAG_DELAY_MS supaya gak ganggu nag/retry yang sah.
export const MIN_RENOTIFY_GAP_MS = 2 * 60 * 1000

export const REMINDER_TRIGGER_URL = `${getAppUrl()}/api/reminders/trigger`

type ReminderRow = Pick<Message, "id" | "remindAt" | "reminderVersion" | "isRemindDone">
type CancelableRow = Pick<Message, "id" | "remindQstashId">

// Batalkan job QStash yang lagi nunggu buat reminder ini. Best-effort — kalau job udah
// kepake / expired / gak ketemu di sisi QStash, kegagalannya diabaikan aja. Perlindungan
// utama terhadap job basi tetap dari reminderVersion check di endpoint trigger; fungsi ini
// cuma optimisasi supaya gak ada job nganggur numpuk di QStash.
export async function cancelReminderJob(prisma: PrismaClientExtended, message: CancelableRow) {
  if (!message.remindQstashId) return
  try {
    await qstashClient.messages.cancel(message.remindQstashId)
  } catch {
    // aman diabaikan
  }
  await prisma.message.updateMany({
    where: { id: message.id, remindQstashId: message.remindQstashId },
    data: { remindQstashId: null },
  })
}

async function scheduleReminderJob(prisma: PrismaClientExtended, message: ReminderRow) {
  if (!message.remindAt) return
  // Math.ceil (bukan floor) + buffer 2 detik: delay dijamin selalu >= selisih asli ke
  // remindAt, biar job gak pernah nembak SEBELUM remindAt. Kalau nembak lebih awal walau
  // cuma sepersekian detik, claim di endpoint trigger (syaratnya remindAt <= now) gagal
  // diam-diam tanpa bekas — ini akar reminder yang "hilang" tanpa jejak kemarin.
  const rawSeconds = (message.remindAt.getTime() - Date.now()) / 1000
  const delaySeconds = Math.max(0, Math.ceil(rawSeconds) + 2)
  const res = await qstashClient.publishJSON({
    url: REMINDER_TRIGGER_URL,
    body: { messageId: message.id, version: message.reminderVersion, kind: "fire" as const },
    delay: delaySeconds,
  })
  await prisma.message.update({
    where: { id: message.id },
    data: { remindQstashId: res.messageId },
  })
}

// Dipanggil tiap kali remindAt sebuah reminder berubah (set reminder baru / snooze):
// batalkan job lama (kalau ada) lalu jadwalkan job baru sesuai remindAt & reminderVersion
// terkini. Kalau remindAt-nya null (reminder dimatikan) atau reminder udah ditandai
// selesai, gak ada job baru yang dijadwalkan.
//
// Kegagalan publish ke QStash sengaja gak dilempar ke caller — reminder tetap tersimpan
// di database (source of truth), cuma job pengingatnya belum sempat terjadwal.
export async function rescheduleReminderJob(
  prisma: PrismaClientExtended,
  message: ReminderRow & CancelableRow
) {
  await cancelReminderJob(prisma, message)
  if (!message.remindAt || message.isRemindDone) return
  try {
    await scheduleReminderJob(prisma, message)
  } catch (err) {
    console.error("[reminderScheduler] gagal menjadwalkan reminder", message.id, err)
  }
}