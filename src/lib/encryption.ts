import { createCipheriv, createDecipheriv, randomBytes } from "crypto"

// AES-256-GCM: authenticated encryption, IV unik tiap kali enkripsi, auth tag mencegah
// data di-tamper diam-diam. Key WAJIB 32 byte, disimpan sbg base64 di env NOTE_ENCRYPTION_KEY.
//
// Generate sekali (jalankan di terminal, JANGAN commit hasilnya ke git):
//   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
//
// PENTING: set env var ini di Vercel (semua environment) SEBELUM deploy kode ini — modul ini
// throw saat startup kalau key belum ada / salah panjang, jadi app gak akan boot tanpa key.
const ALGO = "aes-256-gcm"
const KEY = Buffer.from(process.env.NOTE_ENCRYPTION_KEY ?? "", "base64")

if (KEY.length !== 32) {
  throw new Error(
    "NOTE_ENCRYPTION_KEY harus 32 byte dalam base64. Generate: " +
      "node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\""
  )
}

// Prefix versi — kalau nanti ganti algoritma/key, gampang bedain data lama vs baru tanpa nebak.
const PREFIX = "v1:"

export function encryptField(plain: string): string {
  const iv = randomBytes(12) // 96-bit IV standar buat GCM
  const cipher = createCipheriv(ALGO, KEY, iv)
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()])
  const authTag = cipher.getAuthTag()
  return PREFIX + Buffer.concat([iv, authTag, ciphertext]).toString("base64")
}

export function decryptField(value: string): string {
  // Row lama yang belum di-backfill (atau apapun yang somehow belum terenkripsi) dikembalikan
  // apa adanya, BUKAN di-throw — biar UI gak putih/error selama masa transisi sebelum backfill
  // script dijalankan. Setelah backfill selesai, cabang ini seharusnya gak pernah kepakai lagi.
  if (!value.startsWith(PREFIX)) return value

  const raw = Buffer.from(value.slice(PREFIX.length), "base64")
  const iv = raw.subarray(0, 12)
  const authTag = raw.subarray(12, 28)
  const ciphertext = raw.subarray(28)

  const decipher = createDecipheriv(ALGO, KEY, iv)
  decipher.setAuthTag(authTag)
  const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()])
  return plain.toString("utf8")
}