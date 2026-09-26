import { Client } from "@upstash/qstash"

// Pakai kredensial region-pinned kalau tersedia (US_EAST_1_QSTASH_*),
// fallback ke default QSTASH_TOKEN/QSTASH_URL bawaan SDK.
const token = process.env.US_EAST_1_QSTASH_TOKEN || process.env.QSTASH_TOKEN
const baseUrl = process.env.US_EAST_1_QSTASH_URL || process.env.QSTASH_URL

export const qstashClient = new Client({
  token,
  ...(baseUrl ? { baseUrl } : {}),
})

// URL absolut deployment production, dipakai buat nyusun target endpoint yang dipanggil QStash.
// Set APP_URL di env kalau domainnya beda dari default (mis. custom domain).
export function getAppUrl() {
  return process.env.APP_URL || "https://chatme-jet.vercel.app"
}