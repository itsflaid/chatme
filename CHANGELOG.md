# Changelog

## Fase 1 — Critical Fix: Modal Portal & IndexedDB Cache

### Perubahan

- **Baru:** `src/components/ui/ModalPortal.tsx` — primitive portal ke `document.body` untuk modal, mengatasi bug `position: fixed` yang rusak akibat `transform` di `MobileLayout.tsx`
- **13 titik `fixed inset-0`** dibungkus `<ModalPortal>`:
  - Kelompok A (bungkus langsung): `SnoozeModal`, `DeleteMessageModal`, `DeleteRoomModal`, `EditMessageModal`, `EditRoomModal`, `PinnedMessagesModal`, `RemindModal`, `ChecklistComposer`, `ChatHeader` (reminder list), `ChecklistBubble` (edit mode), `AddRoomButton`
  - Kelompok B (restructure + portal): `ContextMenu` (overlay jadi parent panel + stopPropagation), `RoomSettingsMenu` (pakai koordinat props, `absolute` → `fixed`, + stopPropagation)
- **`ChatHeader.tsx`:** tambah `ref` ke tombol titik-tiga, hitung posisi via `getBoundingClientRect()`, kirim `{x, y}` ke `RoomSettingsMenu`
- **`Providers.tsx`:** fix `shouldDehydrateQuery` predicate — `queryKey[0]` adalah array `["room","list"]`, bukan string `"rooms"`. IndexedDB sekarang benar-benar persist data

## Fase 2 — Mutation Context & Cache Optimization

### Perubahan

- **Baru:** `src/hooks/useMessageActions.tsx` — `MessageActionsProvider` context menyatukan 7 mutation hook, dipasang di `ChatContainer`, digunakan oleh `BubbleWrapper` (sebelumnya 7 hook × N bubble)
- **`useMessages.ts`:** `updateMessagesCache` sekarang patch per-page (bukan flatten-rebuild), ditambah `updateMessagesCacheFlatten` untuk send/delete
- **`BotBubble.tsx`:** callback `onDone`/`onSnooze` terima ID langsung, panggil dari dalam komponen — `ChatMessages.tsx` pass function reference, bukan inline arrow
- **`ChatContainer.tsx`:** `handleBotDone`/`handleBotSnooze` dibungkus `useCallback`
- **`ChecklistBubble.tsx`:** `toggleItem` pake `useToggleChecklistItem` (via `useMutation`), bukan `utils.client.*.mutate()` langsung

## Fase 3 — Prefetch Data Room

### Perubahan

- **`RoomItem.tsx`:** tambah `prefetchInfinite` data `message.list` via `onPointerDown` (selain `router.prefetch` via `onMouseEnter` yang sudah ada). Data pesan mulai di-fetch sebelum navigasi selesai

## Fase 5 — Optimistic Room Mutations

### Perubahan
- **`useRooms.ts`:** tambah `useCreateRoom`, `useUpdateRoom`, `useDeleteRoom` — optimistic update (update/delete) & skip invalidate (create)
- **`AddRoomButton.tsx`:** pake `useCreateRoom` → room muncul tanpa refetch penuh
- **`EditRoomModal.tsx`:** pake `useUpdateRoom` → edit langsung berubah di sidebar (optimistic), rollback otomatis kalau gagal
- **`DeleteRoomModal.tsx`:** pake `useDeleteRoom` → room hilang seketika dari sidebar, redirect `/` tetap jalan

## Fase 6 — Satu Pintu Cache Writer untuk `message.list`

### Perubahan
- **`useMessages.ts`:** export `updateMessagesCache` & `updateMessagesCacheFlatten` biar bisa dipakai dari luar
- **`BubbleWrapper.tsx`:** `handleChecklistUpdate` pakai `useCallback` + `updateMessagesCache` (bukan inline `setQueryData`) → `ChecklistBubble.memo()` benar-benar jalan
- **`ChatContainer.tsx`:** `handleCheckReminders` pakai `updateMessagesCacheFlatten` (bukan raw `setQueryData`)
