/* Hitungan tampilan dasbor admin (app/admin/page.tsx): tren 7 hari, daftar
   "Perlu dicek", dan titik grafik area. Murni — tanpa React/Supabase/alias "@/"
   — biar bisa dites langsung (tests/admin-tampil.test.mjs). */

export type PerHari = { tanggal: string; n: number }[];

/** 7 hari terakhir vs 7 hari sebelumnya. persen null kalau minggu lalu 0 (gak ada pembanding). */
export function tren(data: PerHari, n = 7): { ini: number; lalu: number; persen: number | null } {
  const jml = (a: PerHari) => a.reduce((s, x) => s + x.n, 0);
  const ini = jml(data.slice(-n));
  const lalu = jml(data.slice(-2 * n, -n));
  return { ini, lalu, persen: lalu ? Math.round(((ini - lalu) / lalu) * 100) : null };
}

/** Batas atas sumbu yang enak dibaca: 1, 2, 5, 10, 20, 50 … (minimal 4 biar garis bantu gak dempet). */
export function atasRapi(maks: number): number {
  if (maks <= 4) return 4;
  const pangkat = 10 ** Math.floor(Math.log10(maks));
  for (const k of [1, 2, 2.5, 5, 10]) if (k * pangkat >= maks) return k * pangkat;
  return 10 * pangkat;
}

/** Path SVG garis + area untuk grafik w×h. Titik pertama di x=0, terakhir di x=w. */
export function jalurArea(data: PerHari, w: number, h: number) {
  const atas = atasRapi(Math.max(0, ...data.map(d => d.n)));
  const langkah = data.length > 1 ? w / (data.length - 1) : 0;
  const titik = data.map((d, i) => ({ x: +(i * langkah).toFixed(1), y: +(h - (d.n / atas) * h).toFixed(1), ...d }));
  const garis = titik.map((t, i) => `${i ? "L" : "M"}${t.x} ${t.y}`).join(" ");
  const area = titik.length ? `${garis} L${w} ${h} L0 ${h} Z` : "";
  return { atas, titik, garis, area };
}

export type Nada = "bad" | "warn" | "ok";
export interface Cek { nada: Nada; judul: string; ket: string; ke: string }

/** Hal yang butuh tindakan admin, paling gawat duluan. Kosong = aman semua. */
export function perluDicek(x: {
  pendingNyangkut: number;
  errorHari: number | null;
  sesiReview: number | null;
  segeraHabis: number;
  bankKosong: string[];
}): Cek[] {
  const out: Cek[] = [];
  if (x.pendingNyangkut) out.push({ nada: "bad", judul: `${x.pendingNyangkut} transaksi PENDING > 1 jam`, ket: "Webhook Midtrans mungkin macet", ke: "#adm-uang" });
  if (x.errorHari) out.push({ nada: "bad", judul: `${x.errorHari} error dalam 24 jam`, ket: "Lihat daftar error terbaru", ke: "#adm-error" });
  if (x.sesiReview) out.push({ nada: "warn", judul: `${x.sesiReview} sesi punya soal ditandai REVIEW`, ket: "Cek & betulin teks soalnya", ke: "#adm-konten" });
  if (x.segeraHabis) out.push({ nada: "warn", judul: `${x.segeraHabis} Pro habis ≤ 7 hari`, ket: "Calon perpanjangan", ke: "#adm-uang" });
  if (x.bankKosong.length) out.push({ nada: "warn", judul: `Bank soal kosong: ${x.bankKosong.join(", ")}`, ket: "Belum ada soal di kategori ini", ke: "#adm-konten" });
  return out;
}
