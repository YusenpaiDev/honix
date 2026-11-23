/* Aturan iPaymu yang murni (tanpa fetch/Supabase/alias "@/") — rumus tanda
   tangan, format waktu, dan arti kode status. Dites di tests/ipaymu.test.mjs.
   Dok: https://docs.ipaymu.com/en/docs/signature · /docs/callback ·
   /docs/transaction/check-transaction */
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/**
 * Tanda tangan permintaan ke API iPaymu:
 *   HMAC-SHA256( METHOD:VA:sha256hex(bodyJson):APIKEY , kunci = APIKEY ), hex.
 * `bodyJson` HARUS string yang persis sama dengan yang dikirim sebagai body.
 */
export function tandaTanganPermintaan(method: string, va: string, bodyJson: string, apiKey: string): string {
  const hashBody = createHash("sha256").update(bodyJson).digest("hex").toLowerCase();
  return createHmac("sha256", apiKey).update(`${method.toUpperCase()}:${va}:${hashBody}:${apiKey}`).digest("hex");
}

/** Header `timestamp` iPaymu: YYYYMMDDHHmmss, jam WIB. */
export function waktuIpaymu(d = new Date()): string {
  const w = new Date(d.getTime() + 7 * 3_600_000).toISOString(); // geser ke WIB, baca sebagai UTC
  return w.slice(0, 19).replace(/[-T:]/g, "");
}

/* Callback: kolom yang wajib jadi angka/boolean/array sebelum di-hash. */
const ANGKA = ["trx_id", "status_code", "transaction_status_code", "paid_off"];

/** json_encode PHP bawaan: "/" jadi "\/" dan karakter non-ASCII jadi \uXXXX. */
function jsonAlaPhp(nilai: unknown): string {
  return JSON.stringify(nilai)
    .replace(/\//g, "\\/")
    .replace(/[\u0080-￿]/g, c => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"));
}

/**
 * Tanda tangan callback (header X-Signature):
 * normalisasi tipe → buang `signature` → urutkan kunci (ksort) → json_encode
 * ala PHP → HMAC-SHA256 dengan kunci = nomor VA, hex.
 */
export function tandaTanganCallback(isi: Record<string, unknown>, va: string): string {
  const n: Record<string, unknown> = { ...isi };
  delete n.signature;
  for (const k of ANGKA) if (k in n && n[k] !== null && n[k] !== "") n[k] = Number(n[k]);
  if ("is_escrow" in n) n.is_escrow = n.is_escrow === true || n.is_escrow === "1" || n.is_escrow === "true";
  if (!Array.isArray(n.additional_info)) n.additional_info = [];
  const urut: Record<string, unknown> = {};
  for (const k of Object.keys(n).sort()) urut[k] = n[k];
  return createHmac("sha256", va).update(jsonAlaPhp(urut)).digest("hex");
}

/** Bandingin tanda tangan tanpa bocor lewat waktu eksekusi. */
export function samaAman(a: string, b: string): boolean {
  const x = Buffer.from(a.toLowerCase()), y = Buffer.from(b.toLowerCase());
  return x.length === y.length && timingSafeEqual(x, y);
}

export type StatusTransaksi = "pending" | "lunas" | "gagal" | "kadaluarsa" | "refund";

/**
 * Kode status dari API cek transaksi iPaymu → status di tabel `transaksi`.
 * 1 = berhasil, 6 = berhasil (belum settle — uangnya udah diterima),
 * 0 = pending, -2 = kadaluarsa, 3 = refund, 2/4/5 = batal/error/gagal.
 * Kode yang gak dikenal dianggap pending: lebih aman nunggu daripada salah nyalain Pro.
 */
export function statusDariKode(kode: unknown): StatusTransaksi {
  switch (Number(kode)) {
    case 1: case 6: return "lunas";
    case -2: return "kadaluarsa";
    case 3: return "refund";
    case 2: case 4: case 5: return "gagal";
    default: return "pending";
  }
}

/** Isi callback bisa form-urlencoded (bawaan) atau JSON — dua-duanya jadi objek. */
export function bacaIsiCallback(teks: string, contentType: string | null): Record<string, unknown> {
  if ((contentType ?? "").includes("application/json")) {
    const j = JSON.parse(teks || "{}");
    return j && typeof j === "object" && !Array.isArray(j) ? j : {};
  }
  return Object.fromEntries(new URLSearchParams(teks));
}
