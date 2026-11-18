/**
 * "Tampilkan data terakhir dulu" — salinan data per akun di localStorage.
 *
 * Pola: buka halaman → isi dari salinan terakhir LANGSUNG tampil (tanpa
 * nunggu jaringan) → data terbaru diambil di belakang → angkanya diperbarui
 * sendiri. Salinan ini cuma buat tampilan awal; yang dipercaya tetap data
 * dari Supabase yang nyusul, dan itu selalu nimpa salinan.
 *
 * Aman lintas akun: tiap salinan nyimpen uid pemiliknya, dan uid dibandingin
 * sama sesi yang lagi login (getSession = baca cookie, gak lewat jaringan).
 * Keluar akun → semua salinan dihapus (hapusCacheLokal di TombolKeluar).
 *
 * Murni (cuma localStorage) biar bisa dites; uid-nya dari uid-lokal.ts.
 */

const AWALAN = "honix-c:";
/* Lebih dari ini gak disimpen — localStorage cuma ±5 MB per situs dan
   dipakai bareng fitur lain. */
const MAKS_BYTE = 400_000;

interface Bungkus<T> { uid: string; v: T }

export function bacaCache<T>(nama: string, uid: string | null): T | null {
  if (!uid) return null;
  try {
    const mentah = localStorage.getItem(AWALAN + nama);
    if (!mentah) return null;
    const b = JSON.parse(mentah) as Bungkus<T>;
    return b.uid === uid ? b.v : null;
  } catch { return null; }
}

export function simpanCache<T>(nama: string, uid: string, v: T): void {
  try {
    const isi = JSON.stringify({ uid, v } satisfies Bungkus<T>);
    if (isi.length > MAKS_BYTE) { localStorage.removeItem(AWALAN + nama); return; }
    localStorage.setItem(AWALAN + nama, isi);
  } catch { /* mode privat / penuh — jalan tanpa salinan */ }
}

/** Hapus semua salinan — dipanggil pas keluar akun. */
export function hapusCacheLokal(): void {
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith(AWALAN)) localStorage.removeItem(k);
  } catch { /* */ }
}
