// Enkripsi semua Message.text & ChecklistItem.text yang masih plaintext di database.
// WAJIB dijalankan SEKALI setelah deploy field-encryption & NOTE_ENCRYPTION_KEY di-set —
// tanpa ini, row lama tetap plaintext dan baru ke-enkripsi kalau user edit ulang catatan itu.
//
// Aman dijalankan berkali-kali (idempotent): row yang udah ber-prefix "v1:" dilewati.
//
//   node scripts/backfill-encrypt-messages.mjs

import { PrismaClient } from "@prisma/client"
import { createCipheriv, randomBytes } from "crypto"

process.loadEnvFile(".env")

const KEY = Buffer.from(process.env.NOTE_ENCRYPTION_KEY ?? "", "base64")
if (KEY.length !== 32) {
  console.error("NOTE_ENCRYPTION_KEY belum di-set / bukan 32 byte base64 di .env")
  process.exit(1)
}

const PREFIX = "v1:"

function encryptField(plain) {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", KEY, iv)
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()])
  const authTag = cipher.getAuthTag()
  return PREFIX + Buffer.concat([iv, authTag, ciphertext]).toString("base64")
}

// SENGAJA `new PrismaClient()` polos (bukan import dari src/lib/prisma.ts) — biar baca &
// tulis kolom `text` apa adanya (raw), bukan lewat auto-decrypt extension.
const prisma = new PrismaClient()

async function backfillModel(label, findMany, updateOne) {
  const rows = await findMany()
  let done = 0
  for (const row of rows) {
    if (row.text.startsWith(PREFIX)) continue // udah terenkripsi, skip
    await updateOne(row.id, encryptField(row.text))
    done++
  }
  console.log(`${label}: ${done}/${rows.length} baris di-enkripsi.`)
}

await backfillModel(
  "messages",
  () => prisma.message.findMany({ select: { id: true, text: true } }),
  (id, text) => prisma.message.update({ where: { id }, data: { text } })
)

await backfillModel(
  "checklist_items",
  () => prisma.checklistItem.findMany({ select: { id: true, text: true } }),
  (id, text) => prisma.checklistItem.update({ where: { id }, data: { text } })
)

await prisma.$disconnect()
