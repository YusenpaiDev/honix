/* Judul set yang ditampilin ke user. Judul di database masih nyebut sesi
   ujian aslinya ("JLPT N2 2024年12月 聴解", "2024年12月 筆記", "… 過去問").
   Di app, set Bank Soal sengaja gak nyebut sesi ujian (lihat
   perjalanan-soal.ts — namanya pos), jadi tanggal, "JLPT", dan "過去問"
   dibuang pas tampil. Database gak diubah: tanggalnya masih dipakai buat
   ngurutin pos & ngelompokin 筆記 + 聴解. Murni — dites di
   tests/judul-set.test.mjs. */

const TANGGAL = /(19|20)\d{2}\s*年\s*\d{1,2}\s*月/g;
const ASLI = /過去問|真題/g;

export function judulSet(judul: string | null | undefined): string {
  const t = (judul ?? "").trim();
  if (!t) return "";
  if (!t.match(TANGGAL) && !t.match(ASLI)) return t;
  const level = t.match(/\bN[1-5]\b/)?.[0] ?? null;
  const sisa = t
    .replace(TANGGAL, " ")
    .replace(ASLI, " ")
    .replace(/\bJLPT\b/gi, " ")
    .replace(/\bN[1-5]\b/, " ")
    .replace(/\s*[—–\-·|]\s*/g, " · ")
    .replace(/\s+/g, " ")
    .replace(/^(\s*·\s*)+|(\s*·\s*)+$/g, "")
    .replace(/(\s*·\s*){2,}/g, " · ")
    .trim();
  const kepala = level ? `Set latihan ${level}` : "Set latihan";
  return sisa ? `${kepala} · ${sisa}` : kepala;
}
