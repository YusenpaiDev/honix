/* Pengingat kurikulum di lonceng (peringatan.ts): tes penempatan buat yang
   kurikulumnya belum jalan, dan Ulangan Senin yang kelewat (sampai Rabu).
   Murni — flag fitur & data dikirim pemanggil — biar bisa dites tanpa React,
   Supabase, atau alias "@/" (tests/peringatan-kurikulum.test.mjs). */

/** Penanda di localStorage, ditulis kartu Misi (MisiHarian). */
export const KUNCI_LEWAT_ULANGAN = "honix:lewat-ulangan";       // isinya: senin yang dilewati
export const KUNCI_ADA_ULANGAN = "honix:ulangan-ada";           // isinya: "<senin>:1" / "<senin>:0"

export interface PeringatanKurikulum {
  id: string;
  tingkat: "ingat";
  ikon: string;
  judul: string;
  pesan: string;
  aksi: { label: string; href: string };
  /** Cuma di lonceng, gak naik jadi banner Beranda — Beranda udah punya kartu Misi. */
  hanyaLonceng: true;
}

/** Senin minggu ini (tanggal lokal YYYY-MM-DD). */
export function seninIni(hariIni: string): string {
  const d = new Date(`${hariIni}T12:00:00`);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Baca penanda "minggu ini ada ulangan?" dari kartu Misi. null = belum tahu (Beranda belum dibuka minggu ini). */
export function bacaAdaUlangan(nilai: string | null, senin: string): boolean | null {
  if (!nilai) return null;
  const [s, ada] = nilai.split(":");
  return s === senin ? ada === "1" : null;
}

export function peringatanKurikulum(x: {
  live: { kurikulum: boolean; penempatan: boolean; ulangan: boolean };
  level: string;
  /** true = kurikulum level target udah jalan; false = belum; null = gak kebaca (diem aja). */
  kurikulumJalan: boolean | null;
  hariIni: string;
  /** Dari kartu Misi: minggu ini ada unit buat diulang? null = belum tahu → diem. */
  adaUlangan: boolean | null;
  ulanganSelesai: boolean;
  ulanganDilewati: boolean;
}): PeringatanKurikulum[] {
  const P: PeringatanKurikulum[] = [];
  if (!x.live.kurikulum || x.kurikulumJalan === null) return P;

  if (!x.kurikulumJalan) {
    P.push({
      id: "kurikulum-belum-mulai",
      tingkat: "ingat",
      ikon: "🧭",
      judul: `Kurikulum ${x.level} belum jalan`,
      pesan: x.live.penempatan
        ? "Tes penempatan ±15 menit — hasilnya nentuin kamu mulai dari minggu ke berapa, biar gak ngulang yang udah kamu bisa."
        : "Mulai dari minggu 1 — misi harianmu jadi ngikutin jadwal sampai hari ujian.",
      aksi: { label: x.live.penempatan ? "Mulai tes penempatan" : "Mulai kurikulum", href: "/penempatan" },
      hanyaLonceng: true,
    });
    return P;
  }

  /* Senin dipegang kartu Misi di Beranda. Selasa–Rabu: susulan di lonceng. */
  const hari = new Date(`${x.hariIni}T12:00:00`).getDay();
  if (x.live.ulangan && (hari === 2 || hari === 3) && x.adaUlangan === true && !x.ulanganSelesai && !x.ulanganDilewati) {
    P.push({
      id: `ulangan-${seninIni(x.hariIni)}`,
      tingkat: "ingat",
      ikon: "📝",
      judul: "Ulangan minggu ini belum",
      pesan: hari === 3
        ? "Hari terakhir. 24 soal ±10 menit dari materi minggu lalu — yang lupa langsung masuk misi."
        : "24 soal ±10 menit dari materi minggu lalu. Masih bisa sampai Rabu.",
      aksi: { label: "Mulai ulangan", href: "/progres/ulangan" },
      hanyaLonceng: true,
    });
  }
  return P;
}
