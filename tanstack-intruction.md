# Chatme — Migrasi Cache Layer ke TanStack Query (Instruksi Lengkap untuk OpenCode)

> Dokumen ini menggantikan pendekatan tambal-sulam di `BUGFIX_INSTRUCTIONS.md` sebelumnya untuk bagian cache/data-layer. Beberapa fix di dokumen lama (yang independen dari arsitektur cache) **tetap berlaku dan harus tetap dikerjakan** — ditandai eksplisit di bagian akhir. Sisanya (soal sinkronisasi room list, race condition pesan hilang, cache stale setelah edit/delete, prefetch yang gak guna) **diselesaikan otomatis** sebagai efek samping dari migrasi ini, bukan ditambal manual satu-satu.

---

## 0. Kenapa migrasi, bukan nambal lagi

Root cause sebagian besar bug minggu ini bukan "IndexedDB-nya lambat" — IndexedDB read itu sendiri cepat (hitungan milidetik). Masalahnya ada di **posisi IndexedDB dalam arsitektur**: kode saat ini (`useMessages.ts`, `useRooms.ts`, `lib/cache.ts`) memperlakukan IndexedDB sebagai bagian dari "jalur cepat" (L1 memory Map → L2 IndexedDB → L3 fetch), dengan logic merge manual (cek prefix `temp-`, cek `freshIds`, dispatch `CustomEvent` ke window) yang ditulis ulang sendiri dari nol. Pola begini itu **dikenal rawan race condition** kapan pun ada dua operasi async yang saling overlap (kirim pesan + background revalidate, edit + reload, dst) — dan itu persis yang terjadi.

Posisi yang benar:

```
Server (Postgres/Prisma)
   │
   │  fetch / mutate
   ▼
TanStack Query  ← RAM cache, sinkron untuk re-render, fetch dedup,
   │               retry, optimistic update, cache invalidation antar-query
   │
   │  persist (background, async, "fire and forget")
   ▼
IndexedDB        ← HANYA buat rehidrasi: biar pas tab dibuka lagi / reload,
                    UI gak nampilin blank state sambil nunggu network,
                    DAN jadi fondasi offline mode di masa depan.
                    BUKAN mesin kecepatan utama.
```

TanStack Query yang jadi source of truth di RAM (sinkron, instant untuk re-render). IndexedDB di belakangnya, murni untuk **persist & rehydrate**, bukan untuk dibaca di jalur kritis render pertama kali.

---

## 1. Dependencies

```bash
npm install @tanstack/react-query @tanstack/react-query-persist-client @tanstack/query-async-storage-persister
```

`idb-keyval` sudah ada di `package.json` — dipakai sebagai storage adapter untuk persister, bukan diakses manual lagi dari hook.

> **Catatan penting buat OpenCode:** API persister TanStack Query (`createAsyncStoragePersister`, `PersistQueryClientProvider`, opsi `maxAge`/`dehydrateOptions`/`buster`) bisa saja berubah signature-nya di versi terbaru. **Cek `node_modules/@tanstack/react-query-persist-client/` dan `node_modules/@tanstack/query-async-storage-persister/` (type definitions / README) setelah install**, sesuaikan kode di bawah ini dengan API versi yang ter-install — jangan asumsikan kode di dokumen ini 100% match tanpa verifikasi, karena referensi di sini dibuat berdasarkan pengetahuan yang mungkin sudah agak lawas dibanding versi paket terbaru.

---

## 2. Setup QueryClient + Persister

Buat file baru `src/lib/queryClient.ts`:

```ts
"use client"

import { QueryClient } from "@tanstack/react-query"
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister"
import { get, set, del } from "idb-keyval"

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,        // data dianggap "fresh" 30 detik — gak perlu refetch tiap mount
      gcTime: 24 * 60 * 60_000, // tetap disimpan di cache RAM 24 jam sebelum di-garbage-collect
      retry: 1,
      refetchOnWindowFocus: false, // chat app personal, gak perlu agresif refetch tiap balik ke tab
    },
  },
})

// Storage adapter: IndexedDB via idb-keyval, dibungkus sesuai interface AsyncStorage
// yang diminta createAsyncStoragePersister (getItem/setItem/removeItem, async).
export const idbPersister = createAsyncStoragePersister({
  storage: {
    getItem: async (key: string) => (await get(key)) ?? null,
    setItem: async (key: string, value: string) => set(key, value),
    removeItem: async (key: string) => del(key),
  },
  key: "chatme-query-cache",
  throttleTime: 1000, // jangan tulis ke IndexedDB tiap render, throttle 1 detik
})
```

Lalu wire ke root layout. Cari `src/app/layout.tsx` atau `src/app/(main)/layout.tsx` (tergantung mana yang jadi root client tree), bungkus children dengan `PersistQueryClientProvider`:

```tsx
"use client"

import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client"
import { queryClient, idbPersister } from "@/lib/queryClient"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: idbPersister,
        maxAge: 24 * 60 * 60_000, // data di IndexedDB dianggap valid maks 24 jam
        // dehydrateOptions: cuma persist query yang relevan untuk rehidrasi cepat,
        // jangan persist semua query (misal query auth session gak perlu di-persist di sini)
        dehydrateOptions: {
          shouldDehydrateQuery: (query) =>
            ["rooms", "messages"].includes(query.queryKey[0] as string),
        },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  )
}
```

Pastikan komponen ini dipasang sekali di root, membungkus seluruh subtree yang butuh akses query (sidebar + chat).

---

## 3. Query key convention

Buat file `src/lib/queryKeys.ts` — pengganti `CacheKeys` di `lib/cache.ts` lama, tapi sekarang jadi factory untuk `queryKey` TanStack, bukan string key manual:

```ts
export const queryKeys = {
  rooms: ["rooms"] as const,
  room: (roomId: string) => ["rooms", roomId] as const,
  messages: (roomId: string) => ["messages", roomId] as const,
}
```

---

## 4. Migrasi Room List (`useRooms.ts` → `useQuery`)

Ganti seluruh isi `src/hooks/useRooms.ts`. Hapus `memoryRooms` module-level variable, hapus `updateRoomLastMessage` standalone function, hapus event listener `rooms:updated`/`rooms:refresh` — semuanya digantikan oleh query cache TanStack + invalidation.

```ts
"use client"

import { useQuery } from "@tanstack/react-query"
import { queryKeys } from "@/lib/queryKeys"

export type RoomData = {
  id: string
  name: string
  icon: string
  _count: { messages: number }
  messages: { text: string; createdAt: Date }[]
}

async function fetchRooms(): Promise<RoomData[]> {
  const res = await fetch("/api/rooms")
  if (!res.ok) throw new Error("Gagal mengambil data")
  const data = await res.json()
  return data.rooms.map((r: Record<string, unknown>) => ({
    ...r,
    messages: (r.messages as Record<string, unknown>[]).map((m) => ({
      ...m,
      createdAt: new Date(m.createdAt as string),
    })),
  })) as RoomData[]
}

export default function useRooms(serverRooms?: RoomData[] | null) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.rooms,
    queryFn: fetchRooms,
    initialData: serverRooms ?? undefined, // hydrate dari RSC kalau ada, tanpa nunggu round-trip
  })

  return {
    rooms: data ?? [],
    loading: isLoading,
    error: error ? "Gagal mengambil data" : null,
    refresh: refetch,
  }
}
```

`SidebarWrapper.tsx` gak perlu berubah banyak — interface `{ rooms, loading }` tetap sama, cuma sumbernya sekarang query cache, bukan module-level variable.

---

## 5. Migrasi Messages (`useMessages.ts` → `useInfiniteQuery` + `useMutation`)

Ini bagian terbesar. Ganti `src/hooks/useMessages.ts` sepenuhnya.

### 5.1 Query untuk baca pesan (infinite pagination)

```ts
"use client"

import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query"
import { queryKeys } from "@/lib/queryKeys"
import type { ChatMessage } from "@/types/chat"

type MessagesPage = { messages: ChatMessage[]; hasMore: boolean }

async function fetchMessagesPage(roomId: string, cursor?: string): Promise<MessagesPage> {
  const url = cursor
    ? `/api/rooms/${roomId}/messages?before=${cursor}&limit=30`
    : `/api/rooms/${roomId}/messages?limit=50`
  const res = await fetch(url)
  if (!res.ok) throw new Error("Gagal memuat pesan")
  return res.json()
}

export function useMessagesQuery(roomId: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.messages(roomId),
    queryFn: ({ pageParam }) => fetchMessagesPage(roomId, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.messages[0]?.id : undefined,
    select: (data) => {
      // pages disimpan dari terbaru→lama (karena initial fetch limit=50 terbaru,
      // loadMore ambil yang lebih lama). Flatten & urutkan by createdAt ascending
      // supaya konsumen (ChatMessages.tsx) gak perlu mikirin urutan page.
      const all = data.pages.flatMap((p) => p.messages)
      const unique = new Map(all.map((m) => [m.id, m]))
      return [...unique.values()].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )
    },
  })
}
```

Catatan penting soal pagination cursor: di kode lama, `loadMore` pakai `before=${oldest.id}` di mana `oldest` adalah pesan paling lama yang **sudah ada di state**. Pastikan `getNextPageParam` di atas konsisten — kalau urutan tiap page dari API masih ascending (lihat `messages.reverse()` di `route.ts` baris 49), maka `lastPage.messages[0]` adalah pesan **paling lama** di page itu, sudah benar dipakai sebagai cursor `before` untuk page berikutnya.

### 5.2 Mutations — pengganti `addMessage` + `replaceMessage` (kirim pesan baru)

Ini yang menggantikan P0-1/P0-2 di level arsitektur: `useMutation` dari TanStack **otomatis** mencegah dua mutation identik nyangkut bareng kalau dipasang `mutationKey` + cek `isPending`, dan optimistic update + rollback jadi declarative, bukan manual tempId dance.

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { MessageType } from "@prisma/client"

type SendMessageInput = { roomId: string; userId: string; text: string }

export function useSendMessage(roomId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: ["send-message", roomId], // satu mutationKey per room → TanStack otomatis
                                            // bisa dicek isPending-nya buat cegah double-submit
    mutationFn: async (input: SendMessageInput) => {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: input.roomId, text: input.text }),
      })
      if (!res.ok) throw new Error("Gagal mengirim pesan")
      return res.json() as Promise<ChatMessage>
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.messages(roomId) })
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const tempMessage: ChatMessage = {
        id: tempId,
        text: input.text,
        type: MessageType.TEXT,
        isDone: false,
        isPinned: false,
        isBot: false,
        remindAt: null,
        remindSnoozeAt: null,
        isRemindDone: false,
        sourceMessageId: null,
        roomId: input.roomId,
        userId: input.userId,
        createdAt: new Date(),
        updatedAt: new Date(),
        editedAt: null,
        checklistItems: [],
      }

      // Optimistic append langsung ke infinite query cache (page terakhir)
      queryClient.setQueryData(queryKeys.messages(roomId), (old: any) => {
        if (!old) return old
        const pages = [...old.pages]
        const lastIndex = pages.length - 1
        pages[lastIndex] = {
          ...pages[lastIndex],
          messages: [...pages[lastIndex].messages, tempMessage],
        }
        return { ...old, pages }
      })

      return { tempId }
    },
    onSuccess: (realMessage, _input, context) => {
      // Tukar temp message dengan message asli dari server
      queryClient.setQueryData(queryKeys.messages(roomId), (old: any) => {
        if (!old) return old
        const pages = old.pages.map((page: MessagesPage) => ({
          ...page,
          messages: page.messages.map((m) =>
            m.id === context?.tempId ? realMessage : m
          ),
        }))
        return { ...old, pages }
      })

      // Update preview last message di sidebar — INI yang fix bug "room list gak update"
      queryClient.setQueryData(queryKeys.rooms, (old: RoomData[] | undefined) => {
        if (!old) return old
        const updated = old.map((r) =>
          r.id === roomId
            ? { ...r, messages: [{ text: realMessage.text, createdAt: new Date(realMessage.createdAt) }] }
            : r
        )
        updated.sort((a, b) => {
          const aTime = a.messages[0]?.createdAt?.getTime() ?? 0
          const bTime = b.messages[0]?.createdAt?.getTime() ?? 0
          return bTime - aTime
        })
        return updated
      })

      broadcastInvalidate(queryKeys.rooms) // lihat bagian 7, sinkron ke tab lain
    },
    onError: (_err, _input, context) => {
      // Rollback: buang temp message yang gagal terkirim
      queryClient.setQueryData(queryKeys.messages(roomId), (old: any) => {
        if (!old) return old
        const pages = old.pages.map((page: MessagesPage) => ({
          ...page,
          messages: page.messages.filter((m) => m.id !== context?.tempId),
        }))
        return { ...old, pages }
      })
    },
  })
}
```

Di `ChatInput.tsx`, ganti `handleSend` untuk pakai hook ini:

```tsx
const sendMessage = useSendMessage(roomId)

async function handleSend() {
  if (!text.trim()) return
  if (sendMessage.isPending) return // proteksi double-submit bawaan, tinggal cek isPending
  const trimmed = text.trim()
  setText("")
  if (textareaRef.current) textareaRef.current.style.height = "auto"
  sendMessage.mutate({ roomId, userId, text: trimmed })
}
```

> **PENTING — ini gak menghapus kebutuhan fix P0-1 yang lama.** `mutation.isPending` cuma proteksi dari sisi *logic*, bukan dari sisi *event*. Kalau dua event `keydown` Enter ke-fire dalam tick yang sama (sebelum React commit ulang), keduanya bisa lolos cek `isPending` karena `isPending` juga baru ke-update setelah commit. **Tetap wajib tambahkan guard `e.nativeEvent.isComposing` di `handleKey`** seperti instruksi di `BUGFIX_INSTRUCTIONS.md` P0-1 — itu satu-satunya proteksi yang benar-benar menutup celah race IME Android. Migrasi TanStack ini melengkapi, bukan menggantikan fix itu.

### 5.3 Mutations — edit, delete, toggle, pin, remind

Pola yang sama (`onMutate` optimistic → `onSuccess` confirm + sinkron ke `rooms` query kalau perlu → `onError` rollback) dipakai untuk semua mutation lain. Contoh untuk edit (paling penting karena ini yang nutup bug room-list-gak-update sekaligus):

```ts
export function useEditMessage(roomId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ messageId, text }: { messageId: string; text: string }) => {
      const res = await fetch(`/api/messages/${messageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      })
      if (!res.ok) throw new Error("Gagal edit pesan")
      return res.json() as Promise<ChatMessage>
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.messages(roomId), (old: any) => {
        if (!old) return old
        const pages = old.pages.map((page: MessagesPage) => ({
          ...page,
          messages: page.messages.map((m) =>
            m.id === updated.id ? { ...m, text: updated.text, editedAt: updated.editedAt } : m
          ),
        }))
        return { ...old, pages }
      })

      // Cek apakah ini last message di room (createdAt terbaru di cache messages),
      // kalau iya, update juga preview sidebar tanpa perlu fetch ulang.
      const messagesData = queryClient.getQueryData<any>(queryKeys.messages(roomId))
      const allMsgs = messagesData?.pages.flatMap((p: MessagesPage) => p.messages) ?? []
      const latest = allMsgs.reduce((a: ChatMessage, b: ChatMessage) =>
        new Date(a.createdAt) > new Date(b.createdAt) ? a : b
      , allMsgs[0])

      if (latest?.id === updated.id) {
        queryClient.setQueryData(queryKeys.rooms, (old: RoomData[] | undefined) =>
          old?.map((r) =>
            r.id === roomId
              ? { ...r, messages: [{ text: updated.text, createdAt: r.messages[0]?.createdAt ?? new Date() }] }
              : r
          )
        )
        broadcastInvalidate(queryKeys.rooms)
      }
    },
  })
}
```

Lakukan pola serupa untuk: `useDeleteMessage` (di `onSuccess`, kalau pesan yang dihapus adalah last message, panggil `queryClient.invalidateQueries({ queryKey: queryKeys.rooms })` — untuk delete, **jangan** coba optimistic-compute "pesan sebelumnya" di client, langsung invalidate aja biar di-refetch dari server, lebih simpel dan gak rawan salah), `useTogglePin`, `useToggleDone`, `useSetReminder`, `useSnoozeReminder`, `useChecklistToggle`. Semua pakai struktur yang sama: `mutationFn` → fetch API yang sudah ada (gak perlu ubah endpoint backend sama sekali, semua endpoint di `src/app/api/` tetap dipakai apa adanya) → `onSuccess` update `setQueryData`.

### 5.4 Wiring ke komponen

`ChatContainer.tsx` dan `BubbleWrapper.tsx` saat ini menerima fungsi-fungsi dari `messageAPI` (`patchMessage`, `removeMessage`, dst) sebagai props. Setelah migrasi, ganti jadi terima hook mutation langsung (panggil `useEditMessage(roomId)`, dst, di tempat yang sama) — props interface boleh tetap dipertahankan bentuknya (`onUpdate`, `onRemove`, dll) supaya perubahan di JSX-nya minimal, tinggal isi implementasinya yang diganti dari `messageAPI.patchMessage` jadi `editMutation.mutate(...)`.

---

## 6. Hapus infrastruktur lama

Setelah migrasi di atas selesai dan ditest, hapus:

- `memoryCache` (Map module-level) di `useMessages.ts` — sudah digantikan TanStack Query cache.
- `memoryRooms` (variable module-level) di `useRooms.ts` — sama.
- `window.dispatchEvent(new CustomEvent("rooms:updated", ...))` dan listener-nya — digantikan `setQueryData`/`invalidateQueries` (untuk dalam tab yang sama) + `BroadcastChannel` (lintas tab, lihat bagian 7).
- `window.dispatchEvent(new Event("rooms:refresh"))` di `PinnedMessagesModal.tsx`, `EditRoomModal.tsx`, `DeleteRoomModal.tsx`, `AddRoomButton.tsx` — ganti jadi `queryClient.invalidateQueries({ queryKey: queryKeys.rooms })`.
- Sebagian besar isi `src/lib/cache.ts` (`getCache`, `setCache`, `updateCache`, `invalidate`, `invalidateAll`, `CacheKeys`) — fungsinya sudah diambil alih oleh persister TanStack + `queryKeys.ts`. **Boleh dihapus seluruhnya** kalau tidak ada pemakaian lain di luar dua hook ini (grep dulu untuk pastikan).
- Logic `hadCacheOnMount`, `pendingTemps`/`freshIds` merge manual di `init()` lama — sudah gak ada lagi konsepnya di versi baru, TanStack yang urus.

---

## 7. Cross-tab sync via BroadcastChannel

**Ini gap yang sebelumnya gak ke-cover sama sekali di kode lama maupun rencana awal.** `window.dispatchEvent` cuma jalan **dalam satu tab/document yang sama** — kalau Chatme dibuka di dua tab sekaligus (sering kejadian tanpa sadar, misal buka link baru dari notifikasi), perubahan di satu tab gak akan ke-reflect ke tab lain sama sekali, di kode lama maupun kalau migrasi TanStack tanpa fix ini.

Buat `src/lib/broadcastSync.ts`:

```ts
"use client"

import { queryClient } from "./queryClient"
import type { QueryKey } from "@tanstack/react-query"

const channel = typeof window !== "undefined" ? new BroadcastChannel("chatme-sync") : null

export function broadcastInvalidate(queryKey: QueryKey) {
  channel?.postMessage({ type: "invalidate", queryKey })
}

export function initBroadcastListener() {
  if (!channel) return () => {}
  const handler = (event: MessageEvent) => {
    if (event.data?.type === "invalidate") {
      queryClient.invalidateQueries({ queryKey: event.data.queryKey })
    }
  }
  channel.addEventListener("message", handler)
  return () => channel.removeEventListener("message", handler)
}
```

Panggil `initBroadcastListener()` sekali di root `Providers` component (bagian 2), di dalam `useEffect`. Lalu panggil `broadcastInvalidate(queryKeys.rooms)` atau `broadcastInvalidate(queryKeys.messages(roomId))` di setiap `onSuccess` mutation yang mengubah data (sudah dicontohkan di bagian 5.2). Setiap kali ada perubahan di satu tab, tab lain otomatis refetch query yang relevan dalam hitungan milidetik.

---

## 8. Fix yang TETAP berlaku, independen dari migrasi cache ini

Beberapa item dari `BUGFIX_INSTRUCTIONS.md` sebelumnya **bukan masalah caching**, jadi gak otomatis hilang walau sudah migrasi TanStack. Tetap wajib dikerjakan terpisah:

1. **P0-1 — guard `isComposing` + cek `isPending` di `ChatInput.handleKey`/`handleSend`.** Sudah dijelaskan ulang di bagian 5.2 di atas — wajib, walau sudah pakai `useMutation`.
2. **P2-2 — hapus atau sederhanakan `loading.tsx`.** Ini soal Next.js route-level Suspense yang nge-block di server (`auth()` + `prisma.room.findFirst`), gak ada hubungannya sama TanStack Query yang jalan di client. Rekomendasi tetap sama: hapus `src/app/(main)/room/[id]/loading.tsx` supaya gak ada skeleton dobel nungguin server round-trip yang sebenarnya cuma query metadata ringan (nama, ikon room).
3. **P2-3 — hapus spinner `animate-spin` di `ChatMessages.tsx` baris 211-215** (indikator `loadingMore`). Independen dari sumber data-nya — tetap perlu dihapus manual dari JSX sesuai arahan sebelumnya. Setelah migrasi, ganti kondisinya jadi `isFetchingNextPage` dari `useInfiniteQuery` (tanpa elemen visual spinner, sesuai arahan).

---

## 9. Urutan eksekusi yang disarankan

Jangan big-bang semua sekaligus dalam satu commit besar — pecah supaya gampang ditest tiap tahap:

1. Setup `queryClient.ts` + `Providers` + persister (bagian 2-3). Test: buka app, pastikan gak ada error provider, dan buka DevTools → Application → IndexedDB → cari key `chatme-query-cache` muncul setelah beberapa saat.
2. Migrasi `useRooms.ts` ke `useQuery` (bagian 4). Test: sidebar tetap nampilin room list seperti biasa, refresh halaman, room list tetap muncul instant dari persisted cache sebelum network selesai.
3. Migrasi `useMessages.ts` ke `useInfiniteQuery` untuk **read-only** dulu (belum mutation). Test: buka room, pesan lama tetap muncul, infinite scroll ke atas tetap jalan.
4. Migrasi satu-satu mutation: kirim pesan dulu (bagian 5.2, termasuk fix `isComposing`), test spam-Enter di Android beneran gak dobel lagi. Baru lanjut edit, delete, toggle, pin, remind, checklist satu-satu — test tiap selesai satu.
5. Hapus infrastruktur lama (bagian 6) — HANYA setelah semua mutation di atas udah pindah dan ke-test, supaya gak ada call site yang masih nyandar ke `memoryCache`/`memoryRooms` yang udah dihapus.
6. Tambahkan BroadcastChannel (bagian 7). Test dengan dua tab dibuka bersamaan: edit pesan di tab A, lihat tab B ke-update tanpa refresh manual.
7. Bersihin sisa fix independen (bagian 8).

---

## 10. Acceptance criteria akhir (regression check menyeluruh)

- [ ] Spam Enter 5x cepat di Android Gboard dengan predictive text aktif → cuma 1 pesan terkirim.
- [ ] Kirim pesan dengan network di-throttle "Slow 3G" → pesan optimistic langsung muncul, gak hilang walau ada fetch lain yang sedang jalan.
- [ ] Edit pesan terakhir di sebuah room → preview sidebar update instant tanpa reload.
- [ ] Hapus pesan terakhir → preview sidebar mundur ke pesan sebelumnya secara otomatis.
- [ ] Reload penuh setelah edit/delete → tidak ada flash versi lama sama sekali (data sudah benar dari hasil pertama render, berkat persister).
- [ ] Buka 2 tab Chatme bersamaan, edit pesan di tab A → tab B ikut update dalam <1 detik tanpa refresh manual.
- [ ] Masuk ke room yang sudah pernah dibuka sebelumnya (dalam sesi yang sama atau setelah reload) → skeleton chat tidak muncul sama sekali / instant.
- [ ] Tidak ada lagi pemakaian `memoryCache`, `memoryRooms`, atau `window.dispatchEvent("rooms:updated"/"rooms:refresh")` di seluruh codebase (grep untuk pastikan bersih).