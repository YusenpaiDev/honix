# Honix JLPT

Aplikasi web buat belajar JLPT (N5–N1) pakai bahasa Indonesia — latihan soal format JLPT, choukai dengan audio, kotoba & bunpou, Sensei AI, dan rencana belajar sampai hari ujian. Maskotnya Honix.

Live: **https://www.honixjlpt.com**

## Stack

- Next.js 16 (App Router) + React, Tailwind
- Supabase (auth, Postgres + RLS)
- Vercel (hosting), iPaymu (pembayaran)
- Claude & Gemini buat fitur AI

## Jalanin lokal

```bash
npm install
# bikin .env.local berisi kunci Supabase, AI, & iPaymu (minta ke owner)
npm run dev                  # http://localhost:3000
```

## Perintah lain

| Perintah | Fungsi |
|---|---|
| `npm run lint` | ESLint |
| `node --test tests/*.test.mjs` | tes unit |
| `npm run import` | impor soal JSON ke Supabase |
| `npm run import-audio` / `import-audio-split` | impor audio choukai |
| `npm run import-bunpou` | impor materi bunpou |
| `npm run analisis` | bikin soal dari `materi/` lewat API (berbayar) |
| `npm run backup` | cadangan sesi latihan |

## Struktur singkat

- `src/app` — halaman & route API
- `src/components`, `src/lib` — komponen & logika bersama
- `public/landing` — landing page statis buat tamu (belum login)
- `supabase/` — migration database
- `scripts/` — skrip impor & perawatan data
- `tests/` — tes unit (`node --test`)
