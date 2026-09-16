"use client"

import { QueryClient } from "@tanstack/react-query"
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister"
import { get, set, del } from "idb-keyval"
import superjson from "superjson"

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 24 * 60 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

// PENTING: pakai superjson (bukan default JSON.stringify/parse) buat
// serialize/deserialize cache yang ditulis ke IndexedDB. tRPC link di
// Providers.tsx juga pakai superjson, jadi data yang baru difetch dari
// network punya Date beneran (createdAt, remindAt, dst di message).
// Kalau persister ini masih pakai JSON.stringify polos, tiap kali restore
// dari IndexedDB semua field Date itu balik jadi STRING biasa — diam-diam
// beda dari tipe yang dijanjikan (`Date`), padahal sebelumnya "ketolong"
// karena cuma room.list yang dipersist dan itu keburu ketimpa data
// initialData dari SSR duluan. Sekarang message.list per-room ikut
// dipersist (lihat Providers.tsx), jadi ini wajib biar konten chat yang
// dipulihkan dari IndexedDB gak korup tipe datanya.
export const idbPersister = createAsyncStoragePersister({
  storage: {
    getItem: async (key: string) => (await get(key)) ?? null,
    setItem: async (key: string, value: string) => set(key, value),
    removeItem: async (key: string) => del(key),
  },
  // v2: format serialize berubah ke superjson & scope query yang dipersist
  // berubah (message.list ikut masuk). Ganti nama key biar cache lama
  // (format JSON.stringify polos) gak ke-parse pakai superjson.parse dan
  // gagal diam-diam — device lama cuma refetch dari network sekali, abis
  // itu ke-isi ulang otomatis di key yang baru.
  key: "chatme-query-cache-v2",
  throttleTime: 1000,
  serialize: (client) => superjson.stringify(client),
  deserialize: (cached) => superjson.parse(cached),
})