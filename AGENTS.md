# AGENTS.md — Aturan Kerja

## Workflow Umum

1. **Planning dulu.** Sebelum mulai ngerjain, susun dulu daftar commit apa aja yang bakal dibuat. Catat urutan & nama commit-nya.
2. **Commit per bagian.** Commit di setiap bagian/tahap yang sudah selesai dan menurutmu sudah saatnya commit. Jangan nunggu semuanya kelar baru commit sekali.
3. **Pesan commit singkat & jelas.** Pakai format conventional commit, contoh:
   - `feat: add login google oauth`
   - `fix: ghost click pada modal chat`
   - `refactor: pisah logika auth ke hook`
   - `style: restyle delete room modal`
   - `docs: tambah AGENTS.md`
   - `chore: update dependencies`
4. **Verifikasi dulu, baru push.** Setiap kali selesai (per bagian atau keseluruhan), jalankan verifikasi/lint/build/test kalau ada, pastikan bersih. Baru `git push`.

## Aturan Lain

- Jangan commit file `.env`, `.env.example`, dan file secret lain. Pastikan tetap di `.gitignore`.
- Jangan tambah komentar kode kecuali diminta user.
- Ikuti konvensi & gaya kode yang sudah ada di repo.
- Jangan push kalau masih ada error/verifikasi gagal.

<!-- DevMap Instruction Block -->
## DevMap Context

Before working in this repository, read `DEVMAP.md` for project metadata and available commands.

### Navigation

1. Read `.devmap/index.json`.
2. Pick the relevant feature by name or keywords.
3. Open the matching `.devmap/features/*.json` map.
4. Inspect only files listed in `sourcePriority` first.
5. Fall back to `.devmap/snapshot.json` only when index and feature maps are insufficient.

Do not scan the whole repository. Open source files only when:
- the snapshot is missing or stale
- the snapshot lacks enough detail for the task
- the task requires edit, debug, or refactor
- the user explicitly asks for code changes

When source inspection is needed, inspect the smallest relevant set first.

### Maintenance

- If `.devmap/index.json` is missing, run `devmap analyze`.
- If the snapshot may be stale, run `devmap analyze --fresh`.
- Use `--json` when calling DevMap programmatically.
- Do not edit files inside `.devmap/`.
- Never commit API keys or provider credentials.
<!-- End DevMap Instruction Block -->
