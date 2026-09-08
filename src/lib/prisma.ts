import { PrismaClient } from "@prisma/client"
import { decryptField } from "./encryption"

function createExtendedClient() {
  return new PrismaClient().$extends({
    name: "field-decryption",
    // Auto-decrypt `text` tiap kali model ini dibaca — berlaku otomatis di mana pun model
    // ini muncul di hasil query, TERMASUK nested include (checklistItems di message.list,
    // preview pesan terakhir di getRoomsForUser, dll). Ini yang bikin semua router lain
    // (search, pin, reminder list, sidebar preview) gak perlu disentuh sama sekali.
    result: {
      message: {
        text: {
          needs: { text: true },
          compute(message) {
            return decryptField(message.text)
          },
        },
      },
      checklistItem: {
        text: {
          needs: { text: true },
          compute(item) {
            return decryptField(item.text)
          },
        },
      },
    },
  })
}

// Sisi TULIS sengaja TIDAK di-otomatisasi lewat extension di sini. Nested write (mis.
// `checklistItems: { create: [...] }` di dalam message.create/update) gak lewat query hook
// per-model Prisma extension, jadi kalau enkripsi dipasang di situ, item checklist bisa
// kesimpan PLAINTEXT tanpa ada tanda error apapun — lebih berbahaya daripada gak dienkripsi
// sama sekali. Makanya enkripsi di sisi tulis dilakukan eksplisit di titik-titik yang bikin
// row baru (lihat perubahan di src/server/routers/message.ts & reminders/trigger/route.ts).
type ExtendedPrismaClient = ReturnType<typeof createExtendedClient>

const globalForPrisma = globalThis as unknown as {
  prisma: ExtendedPrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? createExtendedClient()

// Dipakai buat nge-tipe ulang fungsi lain (reminderScheduler, webPush, rooms service) yang
// sebelumnya nerima parameter `PrismaClient` polos dari @prisma/client — client yang sudah
// di-$extends BUKAN `PrismaClient` itu lagi secara tipe TypeScript, jadi semua fungsi yang
// nerima instance prisma sebagai parameter (bukan cuma pakai `ctx.prisma` langsung) harus
// pindah ke tipe ini, kalau enggak akan muncul type error pas build.
export type PrismaClientExtended = typeof prisma

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma