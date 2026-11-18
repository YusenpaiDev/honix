"use client";

import Image from "next/image";
import { X } from "lucide-react";
import { honixSrc } from "@/lib/honix-pose";
import { DISCORD_INVITE, tampilDiBeranda } from "@/lib/komunitas";
import { useKomunitas } from "@/lib/use-komunitas";

/**
 * Kartu ajakan gabung Discord di Beranda.
 *
 * Dipasang dua kali di Beranda: sekali di sidebar (desktop) dan sekali di
 * kolom utama (≤1000px). Di HP sidebar turun ke paling bawah dan lonceng
 * disembunyiin, jadi tanpa salinan di kolom utama ajakannya gak kelihatan
 * sama sekali. CSS yang mutusin mana yang tampil — status tutup/gabung tetap
 * satu (useKomunitas), jadi nutup satu = dua-duanya ilang.
 */
export function AjakanDiscord({ letak }: { letak: "samping" | "kolom" }) {
  const { status, tandaiSelesai } = useKomunitas();
  if (!tampilDiBeranda(status)) return null;

  return (
    <div className={`bv-scard card dc-ajak dc-${letak}`}>
      <div className="s-h">
        Komunitas
        <button type="button" className="dc-tutup" onClick={tandaiSelesai} aria-label="Tutup ajakan Discord">
          <X size={13} />
        </button>
      </div>
      <div className="dc-isi">
        <Image className="dc-hx" src={honixSrc("senang")} alt="" width={56} height={56} />
        <div>
          <div className="dc-t">Belajar bareng di Discord</div>
          <div className="dc-s">Tanya soal, bahas latihan, dan kenalan sama sesama pejuang JLPT.</div>
        </div>
      </div>
      <a
        href={DISCORD_INVITE}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-p sm dc-gabung"
        onClick={tandaiSelesai}
      >
        Gabung Discord ↗
      </a>
    </div>
  );
}
