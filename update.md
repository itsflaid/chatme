# Chatme — Rencana Perbaikan Bug & Refactor Arsitektur

Dokumen ini untuk dieksekusi OpenCode secara berurutan. Setiap fase punya tujuan, file yang disentuh, dan kriteria "selesai" yang harus dicek manual sebelum lanjut ke fase berikutnya.

## Aturan Wajib Sebelum Mulai

1. **Kerjakan fase berurutan.** Jangan loncat ke Fase 2/3 sebelum semua item "Definition of Done" di Fase 1 dicentang. Fase 1 adalah bug 1–2 baris dengan blast radius besar — kalau direfactor bareng arsitektur baru sekaligus, susah tau error baru itu dari bug lama atau dari desain baru.
2. **Satu fase = satu commit.** Jangan gabung beberapa fase dalam satu commit, supaya bisa di-rollback per fase kalau ada yang salah.
3. **Setelah tiap fase**: jalankan `npx tsc --noEmit` dan `npm run build`. Kalau merah, perbaiki dulu sebelum lanjut.
4. **Jangan refactor file di luar yang disebutkan** di tiap fase meski "kelihatan bisa dirapikan". Scope creep = risiko regresi baru yang tidak diminta.
5. **Jangan ubah styling/visual** (className, CSS var neo-brutalism, shadow, rotate, border) kecuali disebutkan eksplisit. ini refactor bug & performa, bukan redesign.
6. **Root bug ada di viewport MOBILE** (`< md` breakpoint, Tailwind). WAJIB test di devtools responsive mode lebar ~375px. Kalau cuma test di desktop, bug-nya tidak akan reproduce dan kamu akan mengira sudah fix padahal belum.
7. Tulis di CHANGELOG.md sederhana di root repo, per fase, isinya file apa saja yang diubah dan kenapa — untuk histori kalau perlu di-review lagi nanti.

---

## Ringkasan Akar Masalah (baca dulu, biar tahu KENAPA sebelum ubah APA)

**Root cause #1 — modal tidak muncul / muncul tapi tidak berfungsi.**
`src/components/layouts/MobileLayout.tsx` (baris ~29–38) memasang `transform: translateX(...)` permanen di div pembungkus `children` dan `sidebar` untuk animasi slide antar halaman mobile. Berdasarkan spesifikasi CSS, `transform` apa pun nilainya pada sebuah ancestor membuat descendant `position: fixed` berhenti relatif ke viewport — jadi relatif ke ancestor bertransform itu. Semua modal di app ini pakai `fixed inset-0`. Akibatnya posisi & stacking context modal jadi tidak konsisten: kadang ke-clip/hilang, kadang overlay-nya malah ke-render di atas tombol asli (klik kena overlay yang cuma manggil `onClose`, bukan kena tombol aksinya) — dua-duanya persis gejala yang dilaporkan.

**Root cause #2 — cache IndexedDB tidak pernah benar-benar menyimpan apa pun.**
`src/app/Providers.tsx` → `shouldDehydrateQuery` mengecek `query.queryKey[0] === "rooms" | "messages"`. Padahal di tRPC React Query, `queryKey[0]` itu **array** (`["room","list"]`), bukan string, dan nama router-nya singular (`room`, `message`, lihat `src/server/routers/_app.ts`). Kondisi ini selalu `false`. Efeknya: setiap reload/buka app = fetch dari nol, tidak ada instant-load dari cache lokal walau kodenya sudah ada dan terlihat berjalan.

**Kontributor performa (bukan bug visual, tapi bikin app kerasa berat):**
- `BubbleWrapper.tsx` instantiate 7 mutation hook per pesan (7 × N pesan).
- `ChecklistBubble.tsx` toggle item pakai `utils.client.checklistItem.toggle.mutate()` langsung, bypass lifecycle React Query, pola beda sendiri dari mutation lain.
- `ChatMessages.tsx` mengirim inline arrow function ke `BotBubble`, mematahkan `memo()`.
- `RoomItem.tsx` cuma prefetch route (JS chunk), belum prefetch data pesannya.

---

## FASE 0 — Persiapan

- [ ] `git checkout -b fix/perf-and-modal`
- [ ] Pastikan build baseline bersih dulu: `npm run build`. Kalau sudah ada error sebelum mulai, catat terpisah — itu bukan tanggung jawab fase ini.
- [ ] Jalankan audit ini, harus dapat **persis 12 lokasi**:
  ```
  grep -rn "fixed inset-0" src/components
  ```
  Daftar 12 lokasi itu ada di Fase 1.2. Kalau hasil grep-mu lebih dari 12, berarti ada modal yang belum tercatat di dokumen ini — berhenti, tambahkan ke daftar Fase 1.2 dulu sebelum eksekusi, jangan diskip.

---

## FASE 1 — Critical Fix (wajib, dampak terbesar, risiko terendah)

### 1.1 Buat primitive `ModalPortal`

File baru: `src/components/ui/ModalPortal.tsx`

```tsx
"use client"

import { createPortal } from "react-dom"
import { useEffect, useState } from "react"

export function ModalPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null
  return createPortal(children, document.body)
}
```

`mounted` state wajib ada: `document.body` tidak tersedia saat SSR Next.js, portal hanya boleh jalan setelah mount di client.

### 1.2 Pasang di 12 titik ini — semua, jangan ada yang kelewat

**Kelompok A — tinggal bungkus, tanpa ubah logic.** Bungkus `return (...)` di tiap file dengan `<ModalPortal>...</ModalPortal>`:

- `src/components/chat/modals/SnoozeModal.tsx`
- `src/components/chat/modals/DeleteMessageModal.tsx`
- `src/components/chat/modals/DeleteRoomModal.tsx`
- `src/components/chat/modals/EditMessageModal.tsx`
- `src/components/chat/modals/EditRoomModal.tsx`
- `src/components/chat/modals/PinnedMessagesModal.tsx`
- `src/components/chat/modals/RemindModal.tsx`
- `src/components/chat/modals/ChecklistComposer.tsx`
- `src/components/chat/ChatHeader.tsx` → blok "Modal Reminder List" saja (cari `fixed inset-0` di file ini), tidak perlu diekstrak jadi komponen terpisah
- `src/components/chat/bubble/ChecklistBubble.tsx` → blok `{editing && (...)}` di bagian bawah file

Pola (contoh pakai `SnoozeModal.tsx`, jangan sentuh apa pun di dalamnya selain menambah wrapper):

```tsx
export default function SnoozeModal({ onSelect, onClose }: Props) {
  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 ..." onClick={...}>
        ...
      </div>
    </ModalPortal>
  )
}
```

**Kelompok B — 2 file ini JANGAN cuma dibungkus, restructure dulu.** Keduanya punya pola overlay dan panel sebagai **sibling terpisah**, bukan nested — ini penyebab spesifik "modal muncul tapi klik tidak ke-trigger" (overlay bisa ke-render di atas panel akibat stacking context yang rusak).

**`src/components/chat/modals/ContextMenu.tsx`**

Dari:
```tsx
return (
  <>
    <div className="fixed inset-0 z-40" onClick={onClose} />
    <div className="neo-panel fixed z-50 ..." style={{ top: safeY, left: safeX }}>
      ...
    </div>
  </>
)
```
Jadi overlay membungkus panel (nested), lalu keduanya di-portal:
```tsx
return (
  <ModalPortal>
    <div className="fixed inset-0 z-40" onClick={onClose}>
      <div
        className="neo-panel fixed z-50 ..."
        style={{ top: safeY, left: safeX }}
        onClick={(e) => e.stopPropagation()}
      >
        ...
      </div>
    </div>
  </ModalPortal>
)
```
`onClick={(e) => e.stopPropagation()}` di panel **wajib** ada, supaya klik di dalam panel tidak menembus ke overlay dan menutup menu sebelum action-nya jalan.

**`src/components/chat/modals/RoomSettingsMenu.tsx`**

Sama seperti `ContextMenu` (nested overlay+panel+stopPropagation), tapi ada masalah tambahan: posisi panel sekarang pakai `absolute right-4 top-16` yang mengandalkan ancestor `position: relative` di header. Begitu di-portal ke `document.body`, anchor ini patah — dropdown akan lompat ke pojok kanan-atas halaman, bukan di bawah tombol titik-tiga.

Fix, ikuti pola `ContextMenu` yang sudah menerima koordinat sebagai props:
1. Di `ChatHeader.tsx`: kasih `ref` ke tombol titik-tiga, saat `onClick` hitung posisi via `ref.current.getBoundingClientRect()`, simpan `{x, y}` di state, kirim sebagai props ke `RoomSettingsMenu`.
2. Di `RoomSettingsMenu.tsx`: terima `x`/`y` sebagai props, ganti `className="absolute right-4 top-16"` jadi `className="fixed"` dengan `style={{ top: y, right: window.innerWidth - x }}` (sesuaikan supaya tetap nempel kanan seperti sebelumnya).
3. Baru bungkus dengan `<ModalPortal>`.

### 1.3 Fix predicate cache IndexedDB

File: `src/app/Providers.tsx` (bukan `queryClient.ts` — pastikan edit di file yang benar).

Ganti:
```ts
dehydrateOptions: {
  shouldDehydrateQuery: (query) =>
    ["rooms", "messages"].includes(query.queryKey[0] as string),
},
```
Jadi:
```ts
dehydrateOptions: {
  shouldDehydrateQuery: (query) => {
    const key = query.queryKey[0]
    return Array.isArray(key) && (key[0] === "room" || key[0] === "message")
  },
},
```
Ini membuat semua query `room.*` dan `message.*` (termasuk `message.list` yang infinite query) ke-persist ke IndexedDB. `checklistItem` sengaja tidak di-persist karena bukan entity yang di-fetch langsung sebagai list.

### ✅ Definition of Done Fase 1 — cek manual satu-satu sebelum lanjut Fase 2

- [ ] Devtools responsive mode, lebar ~375px.
- [ ] Long-press bubble pesan → `ContextMenu` muncul DAN semua tombolnya (salin, edit, dst) benar-benar jalan saat di-tap.
- [ ] Titik-tiga di header room → menu muncul persis di bawah tombol (bukan pojok layar), semua item-nya jalan.
- [ ] Trigger semua modal lain minimal sekali: Edit Room, Delete Room, Pinned Messages, Remind, Snooze, Checklist Composer, Edit Checklist, Reminder List — semua muncul utuh (tidak ke-clip/hilang) dan tombolnya berfungsi.
- [ ] Buka satu room (biar ada data ke-fetch), reload halaman, cek DevTools → Application → IndexedDB → harus ada database `chatme-query-cache` berisi data (sebelumnya kosong).
- [ ] Set Network → Offline di devtools, reload → room yang sudah pernah dibuka tetap menampilkan pesan lama dari cache, bukan blank/infinite skeleton.
- [ ] Test sekali di HP beneran (Android/iOS), bukan cuma emulator devtools — kombinasi `dvh` + transform + portal suka beda perilaku di browser mobile asli.

---

## FASE 2 — Konsolidasi Mutation & Cache

Fase ini bukan fix bug yang kelihatan, tapi ini yang bikin app kerasa ringan saat dipakai harian dengan banyak pesan/checklist. Mulai fase ini **hanya setelah** semua checklist Fase 1 lolos.

### 2.1 Satu sumber mutation, bukan 7 hook × N bubble

`src/components/chat/bubble/BubbleWrapper.tsx` sekarang memanggil 7 hook mutation (`useEditMessage`, `useDeleteMessage`, `useTogglePin`, `useToggleDone`, `useSetReminder`, `useMarkReminded`, `useChecklistToggle`) di dalam setiap instance bubble. 100 pesan = 700 mutation observer nempel bareng untuk hal yang isinya sama semua.

File baru: `src/hooks/useMessageActions.tsx`

```tsx
"use client"

import { createContext, useContext, useMemo } from "react"
import {
  useEditMessage, useDeleteMessage, useTogglePin,
  useToggleDone, useSetReminder, useMarkReminded, useChecklistToggle,
} from "./useMessages"

type MessageActions = {
  editMessage: ReturnType<typeof useEditMessage>
  deleteMessage: ReturnType<typeof useDeleteMessage>
  togglePin: ReturnType<typeof useTogglePin>
  toggleDone: ReturnType<typeof useToggleDone>
  setReminder: ReturnType<typeof useSetReminder>
  markReminded: ReturnType<typeof useMarkReminded>
  checklistToggle: ReturnType<typeof useChecklistToggle>
}

const MessageActionsContext = createContext<MessageActions | null>(null)

export function MessageActionsProvider({
  roomId,
  children,
}: {
  roomId: string
  children: React.ReactNode
}) {
  const editMessage = useEditMessage(roomId)
  const deleteMessage = useDeleteMessage(roomId)
  const togglePin = useTogglePin(roomId)
  const toggleDone = useToggleDone(roomId)
  const setReminder = useSetReminder(roomId)
  const markReminded = useMarkReminded(roomId)
  const checklistToggle = useChecklistToggle(roomId)

  const value = useMemo(
    () => ({ editMessage, deleteMessage, togglePin, toggleDone, setReminder, markReminded, checklistToggle }),
    [editMessage, deleteMessage, togglePin, toggleDone, setReminder, markReminded, checklistToggle]
  )

  return <MessageActionsContext.Provider value={value}>{children}</MessageActionsContext.Provider>
}

export function useMessageActions() {
  const ctx = useContext(MessageActionsContext)
  if (!ctx) throw new Error("useMessageActions harus dipanggil di dalam MessageActionsProvider")
  return ctx
}
```

Lalu:
- Bungkus isi return `ChatContainer.tsx` dengan `<MessageActionsProvider roomId={roomId}>...</MessageActionsProvider>`, membungkus `ChatMessages` dan `ChatInput`.
- Di `BubbleWrapper.tsx`: hapus 7 pemanggilan hook langsung, ganti satu baris: `const { editMessage, deleteMessage, togglePin, toggleDone, setReminder, markReminded, checklistToggle } = useMessageActions()`.
- Logic di dalam `BubbleWrapper` (handleCopy, handleToggleDone, dst) tetap sama persis, hanya sumber hook-nya beda.

### 2.2 Patch cache minimal, jangan flatten-rebuild semua pages

File: `src/hooks/useMessages.ts`, fungsi `updateMessagesCache`.

Sekarang tiap update (misal toggle 1 item checklist) me-flatten SEMUA pesan dari semua pages jadi satu array, lalu re-chunk ulang jadi pages baru dari nol — O(total pesan) untuk 1 klik kecil, dan berisiko mengacaukan batas `hasMore` antar page (pageSize di-infer ulang dari page terakhir, rapuh kalau page terakhir kebetulan lebih pendek dari biasanya).

Ganti pendekatan: patch hanya page yang mengandung pesan target, page lain tidak disentuh sama sekali (reference tetap sama):

```ts
function updateMessagesCache(
  queryClient: ReturnType<typeof useQueryClient>,
  messagesKey: ReturnType<typeof getQueryKey>,
  updater: (messages: ChatMessage[]) => ChatMessage[]
) {
  queryClient.setQueryData(messagesKey, (old: MessagesPageData | undefined) => {
    if (!old) return old
    const pages = old.pages.map((page) => {
      const nextMessages = updater(page.messages)
      const unchanged =
        nextMessages.length === page.messages.length &&
        nextMessages.every((m, i) => m === page.messages[i])
      return unchanged ? page : { ...page, messages: nextMessages }
    })
    return { ...old, pages }
  })
}
```

Poin kunci yang harus dipahami sebelum edit: `updater` sekarang jalan **per-page**, bukan di array gabungan semua page. Untuk update tipe "ubah 1 field di 1 pesan" (`toggleDone`, `togglePin`, `setReminder`, `markReminded`, `checklistToggle` — ini ~90% trafik mutation harian), ini aman langsung diterapkan karena `.map()`/`.filter()` yang sudah ada tetap jalan sama, cuma scope-nya per-page.

**Untuk `send` (nambah pesan baru) HATI-HATI**: pastikan pesan baru ditambahkan hanya ke **page TERAKHIR**, bukan ke setiap page (kalau `updater` untuk `send` masih berupa `msgs => [...msgs, tempMessage]` dan dijalankan per-page tanpa modifikasi, pesan itu akan ketambahan di SETIAP page, bukan cuma sekali). Cek `useSendMessage`'s `onMutate` satu per satu, sesuaikan supaya hanya page terakhir yang di-map dengan penambahan, page lain di-map dengan fungsi identitas.

Kalau ragu soal `send`/`delete` (yang sifatnya menambah/mengurangi jumlah pesan, bukan sekadar ubah field), boleh dipertahankan pakai logic lama (flatten-rebuild) untuk KEDUA case itu saja, dan cuma terapkan optimasi per-page ke 5 mutation "ubah field" di atas. Lebih aman daripada dipaksa seragam dan malah bikin bug baru di pagination.

### 2.3 Stabilkan callback ke `BotBubble`

File: `src/components/chat/ChatMessages.tsx` dan `src/components/chat/bubble/BotBubble.tsx`.

Sekarang `onDone={() => onBotDone(message.id, message.sourceMessageId!)}` — arrow function baru tiap render, mematahkan `memo()` di `BotBubble` walau props sebenarnya tidak berubah.

Ubah `BotBubble` supaya terima ID mentah, bukan closure:
```tsx
type Props = {
  message: Message
  sourceMessage?: Message | null
  onDone: (botMessageId: string, sourceMessageId: string) => void
  onSnooze: (botMessageId: string, sourceMessageId: string) => void
  isNew?: boolean
}
```
`handleDone`/`handleSnooze` di dalam `BotBubble` manggil `onDone(message.id, message.sourceMessageId!)` sendiri.

Di `ChatMessages.tsx`, pass langsung tanpa arrow: `<BotBubble ... onDone={onBotDone} onSnooze={onBotSnooze} />`.

Di `ChatContainer.tsx`, bungkus `handleBotDone`/`handleBotSnooze` dengan `useCallback` (sekarang plain function declaration, jadi baru terus tiap render `ChatContainer` re-render):
```tsx
const handleBotDone = useCallback((botMessageId: string, sourceMessageId: string) => {
  toggleDone.mutate({ id: sourceMessageId, isDone: true })
  markReminded.mutate({ id: botMessageId })
}, [toggleDone, markReminded])
```
(pola sama untuk `handleBotSnooze`.)

### 2.4 Satukan pola mutation checklist item

File: `src/components/chat/bubble/ChecklistBubble.tsx`.

`toggleItem()` sekarang manggil `utils.client.checklistItem.toggle.mutate(...)` langsung — bypass `useMutation` dan lifecycle React Query, pola yang berbeda sendiri dibanding mutation lain di app ini (juga sumber tipe bug `utils.client.<router>.<procedure>.mutate()` yang pernah dikejar sebelumnya).

Tambah di `useMessages.ts`:
```ts
export function useToggleChecklistItem() {
  return trpc.checklistItem.toggle.useMutation()
}
```
Lalu di `ChecklistBubble.tsx`:
```ts
const toggleChecklistItem = useToggleChecklistItem()

async function toggleItem(itemId: string, isDone: boolean) {
  if (isPending) return
  const nextItems = message.checklistItems.map((item) =>
    item.id === itemId ? { ...item, isDone } : item
  )
  const messageIsDone = nextItems.every((item) => item.isDone)
  onUpdate(message.id, { checklistItems: nextItems, isDone: messageIsDone })

  toggleChecklistItem.mutate(
    { id: itemId, isDone },
    {
      onError: () => {
        onUpdate(message.id, {
          checklistItems: message.checklistItems,
          isDone: message.isDone,
        })
      },
    }
  )
}
```
Behavior identik (optimistic update + rollback manual via `onUpdate`), hanya sekarang lewat jalur yang sama dengan mutation lain.

`saveEdit()` di file yang sama (pakai `utils.client.message.updateChecklist.mutate`) boleh dibiarkan apa adanya untuk fase ini — itu bukan hot-path yang sering terpanggil seperti toggle item. Fokus ke `toggleItem` dulu.

### ✅ Definition of Done Fase 2

- [ ] `npx tsc --noEmit` bersih.
- [ ] Buka room dengan 20+ pesan campuran (text, checklist, bot reminder card).
- [ ] React DevTools Profiler → record → toggle 1 item checklist → hanya bubble checklist itu yang re-render (highlight), bubble lain tidak ikut.
- [ ] Toggle done di 1 pesan text → hanya bubble itu yang berubah visual, tidak ada flicker di bubble lain.
- [ ] Aktifkan 2+ bot reminder card sekaligus → interaksi di salah satu (Selesai/Tunda) tidak mengganggu animasi shake card lain.
- [ ] Kirim pesan baru setelah sudah scroll-load beberapa page lama → pesan baru masuk di posisi paling bawah, urutan tetap benar, tidak ada duplikat/hilang.

---

## FASE 3 — Biar Kerasa Instan (Perceived Performance)

### 3.1 Prefetch data room sebelum room dibuka

File: `src/components/sidebar/RoomItem.tsx`.

Sekarang cuma `router.prefetch()` (prefetch route/JS chunk Next.js) — data pesannya (`message.list`) belum di-fetch, jadi begitu masuk room tetap menunggu round-trip pertama.

```tsx
const utils = trpc.useUtils()

const prefetchRoom = useCallback(() => {
  utils.message.list.prefetchInfinite({ roomId: id, limit: 50 })
}, [id, utils])
```
Pasang di `onMouseEnter` (gabung dengan handler yang sudah ada) DAN di `onTouchStart`/`onPointerDown` — mayoritas user app ini mobile, dan tidak ada event hover di touchscreen. `onPointerDown` jalan lebih awal dari `onClick` di kedua jenis device, jadi ini fallback paling universal.

### ✅ Definition of Done Fase 3

- [ ] Network tab → tap salah satu room di sidebar (mobile width) → request `message.list` sudah START sebelum transisi halaman selesai, bukan sesudahnya.
- [ ] Room yang baru pertama kali dibuka tetap ada skeleton sebentar (wajar, belum ke-cache) — tapi buka ulang room yang sama kedua kalinya harus langsung instan tanpa skeleton.

---

## FASE 4 — Polish Opsional (kerjakan hanya setelah Fase 1–3 stabil & sudah dites, bukan prioritas)

- `MessageBubble.tsx`/`BotBubble.tsx`: ganti animasi masuk dari `framer-motion` ke CSS `@keyframes` + class untuk bubble baru (`isNew`) saja — bubble lama render tanpa animasi (`initial={false}` sudah benar, tinggal ganti mekanismenya, tidak perlu JS runtime animasi per-bubble).
- `BotBubble.tsx`: `setInterval(shake, 5000)` per card berjalan selama card tampil. Kalau reminder aktif banyak (>10 bersamaan), banyak timer nempel. Bisa disatukan jadi 1 interval global yang trigger CSS animation class ke semua card lewat context/event — hanya worth dikerjakan kalau user memang sering punya banyak reminder aktif bersamaan.
- `src/server/routers/message.ts` endpoint `list`: query cursor sekarang 2 round-trip DB (`findUnique` ambil `createdAt` cursor, lalu `findMany`). Bisa disederhanakan pakai native cursor Prisma (`cursor: { id: cursor }, skip: 1`) jadi 1 round-trip. Minor, hanya kepakai saat infinite-scroll "load more", bukan initial load.
- Kalau ke depannya 1 room bisa punya ratusan+ pesan dan user sering scroll jauh ke atas: pertimbangkan virtualisasi (`@tanstack/react-virtual`) di `ChatMessages.tsx`. **Jangan dikerjakan sekarang** kalau rata-rata pesan per room masih puluhan — over-engineering untuk kasus yang belum ada.

---

## Checklist Akhir Sebelum Merge

- [ ] Semua 12 titik modal sudah lewat portal — jalankan ulang `grep -rn "fixed inset-0" src` dan telusuri satu-satu, pastikan semuanya jadi children dari `<ModalPortal>`.
- [ ] IndexedDB benar-benar terisi setelah pemakaian normal (test Fase 1).
- [ ] Tidak ada regresi visual — neo-brutalism style (shadow, rotate, border 2px) tetap sama persis di semua modal setelah dipindah lewat portal.
- [ ] Sudah dites di device Android/iOS asli minimal sekali, bukan cuma devtools responsive mode.
- [ ] CHANGELOG.md terisi ringkas per fase.