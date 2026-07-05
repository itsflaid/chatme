# Changelog

## Fase 1 — Critical Fix: Modal Portal & IndexedDB Cache

### Perubahan

- **Baru:** `src/components/ui/ModalPortal.tsx` — primitive portal ke `document.body` untuk modal, mengatasi bug `position: fixed` yang rusak akibat `transform` di `MobileLayout.tsx`
- **13 titik `fixed inset-0`** dibungkus `<ModalPortal>`:
  - Kelompok A (bungkus langsung): `SnoozeModal`, `DeleteMessageModal`, `DeleteRoomModal`, `EditMessageModal`, `EditRoomModal`, `PinnedMessagesModal`, `RemindModal`, `ChecklistComposer`, `ChatHeader` (reminder list), `ChecklistBubble` (edit mode), `AddRoomButton`
  - Kelompok B (restructure + portal): `ContextMenu` (overlay jadi parent panel + stopPropagation), `RoomSettingsMenu` (pakai koordinat props, `absolute` → `fixed`, + stopPropagation)
- **`ChatHeader.tsx`:** tambah `ref` ke tombol titik-tiga, hitung posisi via `getBoundingClientRect()`, kirim `{x, y}` ke `RoomSettingsMenu`
- **`Providers.tsx`:** fix `shouldDehydrateQuery` predicate — `queryKey[0]` adalah array `["room","list"]`, bukan string `"rooms"`. IndexedDB sekarang benar-benar persist data
