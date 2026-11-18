"use client";

import { useCallback, useSyncExternalStore } from "react";
import { bacaStatus, type StatusKomunitas } from "@/lib/komunitas";

/**
 * Status ajakan Discord, dibagi lonceng + kartu Beranda.
 *
 * Pola sama kayak tanda-harian.ts (useSyncExternalStore + cadangan memori buat
 * mode privat), bedanya ini gak ke-reset tiap hari: sekali gabung/tutup, ya
 * selesai. Satu store biar klik Gabung di lonceng langsung ngilangin kartu
 * Beranda juga, tanpa reload.
 */

const KUNCI = "honix-komunitas";
const pendengar = new Set<() => void>();
let cadangan: string | null = null;

function langganan(cb: () => void): () => void {
  pendengar.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    pendengar.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

function ambil(): string | null {
  try {
    const v = localStorage.getItem(KUNCI);
    if (v !== null) return v;
  } catch { /* jatuh ke cadangan */ }
  return cadangan;
}

function simpan(nilai: "dilihat" | "selesai"): void {
  cadangan = nilai;
  try { localStorage.setItem(KUNCI, nilai); } catch { /* mode privat */ }
  for (const cb of pendengar) cb();
}

/* Server & render pertama: anggap "selesai" biar ajakannya gak kedip
   muncul-ilang sebelum localStorage kebaca. */
const diServer = () => "selesai";

export function useKomunitas() {
  const status: StatusKomunitas = bacaStatus(useSyncExternalStore(langganan, ambil, diServer));
  const tandaiDilihat = useCallback(() => {
    if (bacaStatus(ambil()) === null) simpan("dilihat");
  }, []);
  const tandaiSelesai = useCallback(() => simpan("selesai"), []);
  return { status, tandaiDilihat, tandaiSelesai };
}
