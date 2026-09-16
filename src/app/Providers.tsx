"use client"

import { useEffect, useState } from "react"
import { httpBatchLink } from "@trpc/client"
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client"
import { queryClient, idbPersister } from "@/lib/queryClient"
import { trpc } from "@/lib/trpc"
import { initBroadcastListener } from "@/lib/broadcastSync"
import OutboxProcessor from "@/components/system/OutboxProcessor"
import BackgroundSync from "@/components/system/BackgroundSync"
import { MESSAGES_LIMIT } from "@/hooks/useMessages"
import superjson from 'superjson';

// Bentuk data query infinite (message.list) setelah didehydrate. Cuma
// dipakai buat trimming di bawah, bukan tipe ChatMessage lengkap — kita
// gak peduli field lain, cuma butuh createdAt buat sortir waktu.
type InfiniteMessagesData = {
  pageParams: unknown[]
  pages: { messages: { createdAt: string | Date; [key: string]: unknown }[]; hasMore: boolean }[]
}

function isInfiniteMessagesData(data: unknown): data is InfiniteMessagesData {
  return (
    !!data &&
    typeof data === "object" &&
    Array.isArray((data as InfiniteMessagesData).pages) &&
    Array.isArray((data as InfiniteMessagesData).pageParams)
  )
}


export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const cleanup = initBroadcastListener()
    return cleanup
  }, [])

const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: "/api/trpc",
          transformer: superjson,
        }),
      ],
    })
  )

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{
            persister: idbPersister,
            maxAge: 24 * 60 * 60_000,
            dehydrateOptions: {
              // ── Persistence filter ─────────────────────────────────────────
              // `room.*` queries: metadata room buat sidebar/offline access.
              // `message.list` (infinite query isi chat per room) SEKARANG ikut
              // dipersist juga — sebelumnya sengaja dikecualikan karena infinite
              // query bisa bikin IndexedDB membengkak tanpa batas seiring makin
              // banyak "load more" (scroll-back) yang kejadian. Itu ditangani di
              // `serializeData` di bawah: yang beneran ditulis ke storage cuma
              // dipangkas jadi maksimal MESSAGES_LIMIT pesan TERBARU per room,
              // bukan seluruh history yang udah di-load di sesi berjalan.
              shouldDehydrateQuery: (query) => {
                if (query.queryKey[0] === "outbox") return true
                const key = query.queryKey[0]
                if (!Array.isArray(key)) return false
                if (key[0] === "room") return true
                if (key[0] === "message") return true
                return false
              },
              // Pangkas data infinite query (message.list) sebelum ditulis ke
              // IndexedDB. Gak bisa asal ambil `pages[0]` doang — pesan yang
              // baru dikirim/optimistic update bisa nyasar ke page terakhir
              // (lihat updateMessagesCacheFlatten di useMessages.ts, dia
              // nge-flatten semua page terus nge-chunk ulang tanpa sort by
              // waktu). Jadi di sini kita flatten semua pages, sort beneran
              // by createdAt, ambil MESSAGES_LIMIT pesan paling baru, terus
              // bungkus jadi satu page sintetis dengan hasMore: true biar
              // infinite scroll ke atas (load pesan lama) tetap jalan normal
              // lewat network waktu room-nya dibuka lagi.
              serializeData: (data: unknown) => {
                if (!isInfiniteMessagesData(data)) return data
                if (data.pages.length <= 1) return data
                const allMessages = data.pages.flatMap((p) => p.messages)
                const sorted = [...allMessages].sort(
                  (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                )
                const trimmed = sorted.slice(-MESSAGES_LIMIT)
                return {
                  pageParams: [undefined],
                  pages: [{ messages: trimmed, hasMore: true }],
                }
              },
            },
          }}
        >
          <OutboxProcessor />
          <BackgroundSync />
          {children}
        </PersistQueryClientProvider>
    </trpc.Provider>
  )
}