"use client"

import { useEffect, useRef } from "react"
import { useIsRestoring, useQueryClient } from "@tanstack/react-query"
import { getMessagesKey, getRoomsKey, MESSAGES_LIMIT } from "@/hooks/useMessages"
import { trpc } from "@/lib/trpc"
import type { RoomData } from "@/hooks/useRooms"

// Bentuk minimal query cache message.list, cuma buat ngecek udah berapa page
// yang ke-load — gak butuh tipe ChatMessage lengkap di sini.
type CachedMessagesData = { pages: unknown[] }

// Berapa banyak room (diurutkan dari yang paling baru ada aktivitas, sama
// kayak urutan sidebar) yang ikut di-refresh diam-diam tiap kali app
// dibuka/di-resume. Ini beda dari EAGER_PREFETCH_COUNT di RoomList.tsx
// (cuma 3, prioritas kecepatan buka room pas di-tap) — proses ini jalan di
// background jadi bisa nyakup lebih banyak room, biar room yang emang
// sering dibuka beneran ke-refresh & ke-simpan ke IndexedDB, bukan cuma
// yang lagi kebuka doang.
const BACKGROUND_SYNC_ROOM_COUNT = 8

// Jangan resync kalau baru aja jalan < 1 menit lalu (misal user gonta-ganti
// tab / kunci-buka layar berkali-kali dalam waktu singkat).
const MIN_RESYNC_INTERVAL_MS = 60_000

// Komponen headless: gak render apa-apa, cuma efek samping. Tugasnya
// motretin ulang data dari network begitu app dibuka (mount) atau di-resume
// dari background (visibilitychange/focus), lalu nulis hasilnya ke
// TanStack Query cache. Penulisan aktual ke IndexedDB tetap ditangani
// PersistQueryClientProvider (lihat Providers.tsx) yang subscribe ke
// perubahan cache ini dan nulis ke storage tiap ada update (throttled).
//
// Service worker (sw.ts) TIDAK ikut campur di sini — tugasnya cuma network
// caching (HTTP requests) & push notification, bukan nyimpen ke IndexedDB.
// Yang nulis ke IndexedDB adalah query-persist-client + idb-keyval, jadi
// "refresh data begitu masuk app" itu logisnya emang di layer ini.
export default function BackgroundSync() {
    const queryClient = useQueryClient()
    const utils = trpc.useUtils()
    const isRestoring = useIsRestoring()
    const lastSyncRef = useRef(0)

    useEffect(() => {
        // Tunggu restore dari IndexedDB kelar dulu, biar pengecekan "udah berapa
        // page ke-cache" di bawah lihat data hasil restore, bukan cache kosong.
        if (isRestoring) return

        function sync() {
            const now = Date.now()
            if (now - lastSyncRef.current < MIN_RESYNC_INTERVAL_MS) return
            lastSyncRef.current = now

            const roomsKey = getRoomsKey()
            // Refresh daftar room dulu — ini juga yang bikin badge & preview
            // sidebar ikut up to date tiap masuk/resume app, gak nunggu 30 detik
            // staleTime lewat.
            //
            // PENTING: pakai utils.room.list.fetch(), BUKAN invalidateQueries.
            // invalidateQueries cuma nge-trigger refetch pakai queryFn yang UDAH
            // NEMPEL di query itu (dipasang observer/komponen yang subscribe).
            // Query yang baru kebentuk dari HYDRATE (restore IndexedDB) atau yang
            // belum pernah di-observe sama sekali gak punya queryFn — refetch-nya
            // gagal diam-diam jadi "Missing queryFn" (lihat ensureQueryFn di
            // @tanstack/query-core), gak ada indikasi error ke user. fetch() dari
            // tRPC utils bikin queryFn sendiri tiap dipanggil jadi selalu aman,
            // gak peduli ada observer atau enggak. staleTime: 0 maksa tetap ke
            // network walau umur data masih di bawah staleTime default (30 detik).
            utils.room.list.fetch(undefined, { staleTime: 0 }).catch(() => { })

            const rooms = queryClient.getQueryData<RoomData[]>(roomsKey) ?? []
            rooms.slice(0, BACKGROUND_SYNC_ROOM_COUNT).forEach((room) => {
                const messagesKey = getMessagesKey(room.id)
                const cached = queryClient.getQueryData<CachedMessagesData>(messagesKey)
                const cachedPageCount = cached?.pages.length ?? 0

                if (cachedPageCount > 1) {
                    // >1 page cuma bisa kejadian kalau user beneran udah scroll-back
                    // (fetchNextPage) di room ini SELAMA sesi berjalan — satu-satunya
                    // jalan nambah page. Itu berarti query-nya PASTI pernah di-observe
                    // komponen chat, jadi queryFn & getNextPageParam udah nempel.
                    // invalidateQueries di sini justru lebih tepat dari fetchInfinite
                    // manual: dia nge-refetch ULANG semua page yang ada (bukan cuma
                    // page pertama), ngikutin riwayat scroll user, bukan motong balik
                    // ke 1 page.
                    queryClient.invalidateQueries({ queryKey: messagesKey, refetchType: "all" })
                    return
                }

                // 0 atau 1 page: room belum pernah dibuka sesi ini (0), ATAU cuma
                // hasil restore dari IndexedDB yang belum pernah di-observe siapa
                // pun (SELALU persis 1 page sintetis — lihat serializeData di
                // Providers.tsx). Di kedua kasus itu query BISA JADI belum punya
                // queryFn, jadi pakai fetchInfinite (self-contained) bukan
                // invalidateQueries. Aman dipanggil tanpa getNextPageParam karena
                // cuma nge-fetch 1 page awal saat page yang ke-cache <= 1 — gak
                // pernah nyentuh cabang kode yang butuh getNextPageParam.
                utils.message.list
                    .fetchInfinite({ roomId: room.id, limit: MESSAGES_LIMIT }, { staleTime: 0 })
                    .catch(() => { })
            })
        }

        // Jalan begitu restore kelar (mencakup cold start / buka app pertama
        // kali di sesi ini).
        sync()

        function onVisibilityChange() {
            if (document.visibilityState === "visible") sync()
        }

        document.addEventListener("visibilitychange", onVisibilityChange)
        window.addEventListener("focus", sync)
        return () => {
            document.removeEventListener("visibilitychange", onVisibilityChange)
            window.removeEventListener("focus", sync)
        }
    }, [isRestoring, queryClient, utils])

    return null
}