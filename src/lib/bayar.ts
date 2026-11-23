"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { PaketId } from "@/lib/paket";

/* ─── Midtrans Snap types ─────────────────────────────────────── */
declare global {
  interface Window {
    snap?: {
      pay: (token: string, options?: {
        onSuccess?: (result: unknown) => void;
        onPending?: (result: unknown) => void;
        onError?: (result: unknown) => void;
        onClose?: () => void;
      }) => void;
    };
  }
}

/* Snap.js dimuat pas dibutuhin, bukan di setiap kunjungan — kebanyakan orang
   buka halaman harga cuma buat lihat harga. */
function muatSnap(clientKey: string, produksi: boolean) {
  return new Promise<void>((selesai, gagal) => {
    if (window.snap) return selesai();
    const el = document.createElement("script");
    el.src = produksi
      ? "https://app.midtrans.com/snap/snap.js"
      : "https://app.sandbox.midtrans.com/snap/snap.js";
    el.setAttribute("data-client-key", clientKey);
    el.onload = () => selesai();
    el.onerror = () => gagal(new Error("Gagal memuat pembayaran"));
    document.body.appendChild(el);
  });
}

/**
 * Mulai bayar satu paket: popup Midtrans Snap, atau pindah ke halaman bayar
 * iPaymu (GATEWAY_BAYAR=ipaymu di server). Dipakai /premium dan tombol
 * "Perpanjang" di /langganan — dulu logikanya cuma hidup di halaman harga.
 *
 * Aktivasi Pro TIDAK dikerjain di sini — callback Snap jalan di browser dan
 * gampang dipalsukan. Yang mengaktifkan cuma webhook dari gateway ke server.
 * Callback ini murni buat mindahin halaman.
 */
export function useBayar() {
  const router = useRouter();
  const [paying, setPaying] = useState<PaketId | null>(null);
  const [galat, setGalat] = useState<string | null>(null);

  /* Balik pakai tombol Back dari halaman iPaymu → browser mulihin halaman
     dari cache, tombolnya masih "memproses". Lepasin lagi. */
  useEffect(() => {
    const balik = (e: PageTransitionEvent) => { if (e.persisted) setPaying(null); };
    window.addEventListener("pageshow", balik);
    return () => window.removeEventListener("pageshow", balik);
  }, []);

  async function bayar(paketId: PaketId) {
    setGalat(null);
    setPaying(paketId);
    try {
      const res = await fetch("/api/payment/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paketId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal memulai pembayaran.");

      /* iPaymu: halaman bayarnya di situs iPaymu. Selesai bayar, iPaymu
         balikin ke /premium/sukses?order_id=… yang nungguin Pro nyala. */
      if (data.gateway === "ipaymu" && typeof data.url === "string") {
        window.location.assign(data.url);
        return; // `paying` dibiarin nyala — halamannya lagi pindah
      }

      await muatSnap(data.client_key, data.produksi);
      if (!window.snap) throw new Error("Pembayaran gak bisa dibuka. Coba lagi.");

      window.snap.pay(data.token, {
        onSuccess: () => router.push(`/premium/sukses?order_id=${data.order_id}`),
        onPending: () => router.push(`/premium/sukses?order_id=${data.order_id}&pending=1`),
        onError: () => { setGalat("Pembayaran gagal. Coba lagi ya."); setPaying(null); },
        onClose: () => setPaying(null),
      });
    } catch (e) {
      setGalat(e instanceof Error ? e.message : "Ada yang salah. Coba lagi.");
      setPaying(null);
    }
  }

  return { bayar, paying, galat };
}
