import "server-only";
import { tandaTanganPermintaan, waktuIpaymu } from "./ipaymu-aturan";

/**
 * Klien API iPaymu v2 (sisi server). Kunci dari env:
 *   IPAYMU_VA, IPAYMU_API_KEY  — dari dashboard iPaymu → Integrasi
 *   IPAYMU_PRODUKSI=true       — selain itu pakai sandbox
 * Default-nya sandbox, alasannya sama kayak Midtrans: kalau env kelupaan,
 * yang kejadian "bayar gak jalan", bukan transaksi asli ke akun yang salah.
 * Kunci sandbox dan produksi BEDA — jangan dicampur.
 */
export function konfigIpaymu() {
  const va = process.env.IPAYMU_VA?.trim();
  const apiKey = process.env.IPAYMU_API_KEY?.trim();
  const produksi = process.env.IPAYMU_PRODUKSI === "true";
  return {
    va, apiKey, produksi, siap: !!(va && apiKey),
    host: produksi ? "https://my.ipaymu.com" : "https://sandbox.ipaymu.com",
  };
}

type Jawaban<T> = { Status?: number; Success?: boolean; Message?: string; Data?: T };

async function panggil<T>(path: string, body: Record<string, unknown>): Promise<{ ok: boolean; status: number; hasil: Jawaban<T> }> {
  const k = konfigIpaymu();
  if (!k.siap) throw new Error("IPAYMU_VA / IPAYMU_API_KEY belum di-set");
  const json = JSON.stringify(body);
  const res = await fetch(`${k.host}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      va: k.va!,
      signature: tandaTanganPermintaan("POST", k.va!, json, k.apiKey!),
      timestamp: waktuIpaymu(),
    },
    body: json,
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  const hasil = (await res.json().catch(() => ({}))) as Jawaban<T>;
  return { ok: res.ok && hasil.Status === 200, status: res.status, hasil };
}

/** Bikin sesi bayar (redirect). Pembeli dibawa ke `Url`; hasilnya dikabarin ke notifyUrl. */
export function buatPembayaranIpaymu(p: {
  orderId: string; nama: string; ringkas: string; harga: number;
  pembeli: { nama: string; email?: string | null };
  returnUrl: string; cancelUrl: string; notifyUrl: string;
}) {
  return panggil<{ SessionID: string; Url: string }>("/api/v2/payment", {
    product: [p.nama.slice(0, 100)],
    qty: ["1"],
    price: [String(p.harga)],
    description: [p.ringkas],
    returnUrl: p.returnUrl,
    cancelUrl: p.cancelUrl,
    notifyUrl: p.notifyUrl,
    referenceId: p.orderId,
    buyerName: p.pembeli.nama.slice(0, 60),
    ...(p.pembeli.email ? { buyerEmail: p.pembeli.email } : {}),
    expired: 24,                 // jam
    /* Biaya admin iPaymu ditanggung Honix: pembeli bayar persis harga yang
       dia lihat, dan webhook bisa nyocokin nominal == harga paket. */
    feeDirection: "MERCHANT",
  });
}

export interface TransaksiIpaymu {
  TransactionId: number; SessionId?: string | null; ReferenceId?: string | null;
  Amount: number | string; Fee?: number | string; Status: number | string; StatusDesc?: string;
}

/** Status transaksi langsung dari server iPaymu — sumber kebenaran buat nyalain Pro. */
export function cekTransaksiIpaymu(trxId: string | number) {
  return panggil<TransaksiIpaymu>("/api/v2/transaction", { transactionId: String(trxId) });
}
