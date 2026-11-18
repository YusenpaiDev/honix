/**
 * Komunitas Discord Honix — link + aturan kapan ajakannya muncul.
 *
 * Link-nya undangan PERMANEN (gak kedaluwarsa, tanpa batas pakai) ke
 * #selamat-datang, dibikin lewat bot setup 18 Nov 2026. Kalau suatu saat
 * diganti, cukup di sini — lonceng, kartu Beranda, sama landing
 * (public/landing/index.html, ditulis manual karena HTML statis) yang makai.
 *
 * File ini sengaja murni (tanpa React) biar aturannya bisa diuji pakai
 * node --test. Hook-nya ada di use-komunitas.ts.
 */

export const DISCORD_INVITE = "https://discord.gg/sNWEGkYX34";

/**
 * Status ajakan per perangkat (localStorage):
 * - null      → belum pernah lihat: titik merah lonceng nyala, kartu Beranda muncul
 * - "dilihat" → lonceng udah dibuka sekali: item lonceng ilang, kartu Beranda masih ada
 * - "selesai" → udah klik Gabung atau nutup kartu: ajakan gak muncul lagi di mana pun
 */
export type StatusKomunitas = null | "dilihat" | "selesai";

export function bacaStatus(nilai: string | null): StatusKomunitas {
  return nilai === "dilihat" || nilai === "selesai" ? nilai : null;
}

/** Item lonceng tampil kalau belum pernah dilihat — atau lonceng lagi kebuka
 *  pas pertama kali dilihat (biar gak ilang di depan mata pas statusnya
 *  barusan ganti jadi "dilihat"). */
export function tampilDiLonceng(status: StatusKomunitas, dilihatSesiIni: boolean): boolean {
  if (status === "selesai") return false;
  return status === null || dilihatSesiIni;
}

export function tampilDiBeranda(status: StatusKomunitas): boolean {
  return status !== "selesai";
}

/** Bentuknya sama kayak Peringatan biar dirender lonceng apa adanya. */
export const PERINGATAN_KOMUNITAS = {
  id: "komunitas-discord",
  tingkat: "info" as const,
  ikon: "💬",
  judul: "Komunitas Discord Honix udah buka!",
  pesan: "Tanya soal, bahas latihan, dan kenalan sama sesama pejuang JLPT. Gratis buat semua.",
  aksi: { label: "Gabung Discord", href: DISCORD_INVITE, eksternal: true },
};
