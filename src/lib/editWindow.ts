// Batas waktu edit: rolling sejak createdAt.
// Dipakai server (enforce) dan client (sembunyikan tombol edit) biar
// angka magic-nya gak dobel.
export const EDIT_WINDOW_MS = 24 * 60 * 60 * 1000
export const CHECKLIST_EDIT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000
