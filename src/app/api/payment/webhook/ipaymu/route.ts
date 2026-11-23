import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { PAKET, adalahPaket } from "@/lib/paket";
import { cekTransaksiIpaymu, konfigIpaymu } from "@/lib/ipaymu";
import { bacaIsiCallback, samaAman, statusDariKode, tandaTanganCallback } from "@/lib/ipaymu-aturan";

/**
 * Kabar hasil bayar dari iPaymu (notifyUrl). Publik — proxy.ts ngelepas
 * semua /api/payment/webhook*.
 *
 * Isi kabarnya TIDAK dipercaya buat nyalain Pro. Yang dipakai cuma trx_id &
 * reference_id-nya, lalu kita tanya ulang ke API iPaymu (permintaan yang kita
 * tanda tangani sendiri pakai API key): status, nominal, dan pemiliknya.
 * Jadi kabar palsu paling banter bikin kita nanya — gak bisa nyalain Pro.
 * X-Signature tetap dicek & dicatat; kalau gak cocok, kita tetap nanya ke
 * iPaymu (rumus normalisasi PHP-nya rawan beda tipis, dan uang orang yang
 * udah masuk gak boleh nyangkut cuma gara-gara itu).
 *
 * Alur lunas sama kayak webhook Midtrans: klaim atomik `status <> 'lunas'`
 * dulu, baru aktifkan_pro(); gagal aktivasi → klaim dilepas + balas 500
 * biar iPaymu kirim ulang.
 */

const admin = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(), process.env.SUPABASE_SECRET_KEY!.trim(), {
    auth: { persistSession: false },
  });

const OK = () => NextResponse.json({ status: "OK" });

export async function POST(req: NextRequest) {
  const k = konfigIpaymu();
  if (!k.siap) {
    console.error("[ipaymu] IPAYMU_VA / IPAYMU_API_KEY belum di-set — kabar bayar gak bisa diproses");
    return NextResponse.json({ error: "Belum dikonfigurasi" }, { status: 503 });
  }

  let isi: Record<string, unknown>;
  try {
    isi = bacaIsiCallback(await req.text(), req.headers.get("content-type"));
  } catch {
    return NextResponse.json({ error: "Isi tidak terbaca" }, { status: 400 });
  }

  const dikirim = req.headers.get("x-signature") ?? String(isi.signature ?? "");
  const tandaSah = !!dikirim && samaAman(tandaTanganCallback(isi, k.va!), dikirim);
  const trxId = String(isi.trx_id ?? "").trim();
  const orderId = String(isi.reference_id ?? isi.referenceId ?? "").trim();
  if (!/^\d+$/.test(trxId) || !orderId) {
    return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
  }
  if (!tandaSah) console.warn(`[ipaymu] X-Signature gak cocok buat ${orderId} — dicek langsung ke iPaymu`);

  try {
    const sb = admin();
    const { data: tx } = await sb.from("transaksi")
      .select("order_id, user_id, paket_id, jumlah, status, midtrans")
      .eq("order_id", orderId).maybeSingle();
    if (!tx) {
      console.warn("[ipaymu] order gak dikenal:", orderId);
      /* Tanda tangan sah = beneran dari iPaymu, cuma ordernya bukan punya kita
         (sisa tes / salah env) → 200 biar berhenti kirim ulang. */
      return tandaSah ? OK() : NextResponse.json({ error: "Tidak dikenal" }, { status: 401 });
    }
    if (tx.status === "lunas") return OK();

    /* Sumber kebenaran: tanya iPaymu langsung. */
    const cek = await cekTransaksiIpaymu(trxId);
    const d = cek.hasil.Data;
    if (!cek.ok || !d) {
      console.error("[ipaymu] cek transaksi gagal:", trxId, cek.status, cek.hasil.Message);
      return NextResponse.json({ error: "Cek transaksi gagal" }, { status: 502 }); // iPaymu kirim ulang
    }

    /* Transaksi itu harus punya pesanan ini: lewat referenceId, atau SessionID
       yang kita simpan waktu bikin pembayaran. */
    const sesi = (tx.midtrans as { sesi?: string } | null)?.sesi;
    const punyaKita = d.ReferenceId === orderId || (!!sesi && !!d.SessionId && d.SessionId === sesi);
    if (!punyaKita) {
      console.error(`[ipaymu] trx ${trxId} bukan punya ${orderId} (ref ${d.ReferenceId}, sesi ${d.SessionId})`);
      return NextResponse.json({ error: "Transaksi tidak cocok" }, { status: 400 });
    }

    const status = statusDariKode(d.Status);
    const catatan = { gateway: "ipaymu", sesi, trx_id: trxId, tanda_sah: tandaSah, cek: d, kabar: isi };
    const kini = new Date().toISOString();

    if (status !== "lunas") {
      /* neq lunas: kabar telat (pending nyampe sesudah berhasil) gak boleh nurunin. */
      await sb.from("transaksi").update({ status, midtrans: catatan, diperbarui: kini })
        .eq("order_id", orderId).neq("status", "lunas");
      return OK();
    }

    if (!adalahPaket(tx.paket_id)) {
      console.error("[ipaymu] paket gak dikenal di transaksi:", tx.paket_id);
      return OK();
    }
    const paket = PAKET[tx.paket_id];
    if (Math.round(Number(d.Amount)) !== paket.harga) {
      console.error(`[ipaymu] nominal gak cocok buat ${orderId}: dibayar ${d.Amount}, harga ${paket.harga}`);
      await sb.from("transaksi").update({ status: "gagal", midtrans: catatan, diperbarui: kini }).eq("order_id", orderId);
      return OK();
    }

    /* Klaim dulu (atomik), baru aktifkan — lihat webhook Midtrans buat alasannya. */
    const { data: klaim, error: eKlaim } = await sb.from("transaksi")
      .update({ status: "lunas", midtrans: catatan, diperbarui: kini })
      .eq("order_id", orderId).neq("status", "lunas").select("order_id");
    if (eKlaim) {
      console.error("[ipaymu] gagal klaim:", eKlaim.message);
      return NextResponse.json({ error: "Kesalahan server" }, { status: 500 });
    }
    if (!klaim?.length) return OK();

    const { data: sampai, error: eAktif } = await sb.rpc("aktifkan_pro", { p_user_id: tx.user_id, p_bulan: paket.bulan });
    if (eAktif) {
      console.error("[ipaymu] gagal aktifkan Pro:", eAktif.message);
      await sb.from("transaksi").update({ status: tx.status, diperbarui: new Date().toISOString() }).eq("order_id", orderId);
      return NextResponse.json({ error: "Aktivasi gagal" }, { status: 500 });
    }

    console.log(`[ipaymu] Pro aktif buat ${tx.user_id} · ${paket.id} · ` + (paket.bulan === null ? "selamanya" : `sampai ${sampai}`));
    return OK();
  } catch (e) {
    console.error("[ipaymu] error:", e);
    return NextResponse.json({ error: "Kesalahan server" }, { status: 500 });
  }
}
