import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { PAKET, adalahPaket, buatOrderId } from "@/lib/paket";
import { buatPembayaranIpaymu, konfigIpaymu } from "@/lib/ipaymu";

/* Gateway yang dipakai: GATEWAY_BAYAR=ipaymu → iPaymu (halaman bayar redirect),
   selain itu Midtrans Snap. Jalur Midtrans sengaja gak dibuang — kalau akunnya
   aktif, tinggal ganti env ini, gak perlu ngoding ulang. */
const IPAYMU = process.env.GATEWAY_BAYAR === "ipaymu";

/* Sandbox vs produksi cuma beda host. Default-nya sandbox: kalau env-nya
   kelupaan di-set waktu deploy, yang kejadian adalah pembayaran gak jalan —
   bukan transaksi beneran ke kunci yang salah. */
const PRODUKSI = process.env.MIDTRANS_IS_PRODUCTION === "true";
const SNAP_URL = PRODUKSI
  ? "https://app.midtrans.com/snap/v1/transactions"
  : "https://app.sandbox.midtrans.com/snap/v1/transactions";

/** Bypass RLS buat nyatat transaksi — user gak boleh bisa nulis ke tabel ini. */
function admin() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
    process.env.SUPABASE_SECRET_KEY!.trim(),
    { auth: { persistSession: false } }
  );
}

export async function POST(req: NextRequest) {
  try {
    const { paketId } = await req.json();

    if (!adalahPaket(paketId)) {
      return NextResponse.json({ error: "Paket tidak dikenal." }, { status: 400 });
    }
    const paket = PAKET[paketId];

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Login dulu sebelum berlangganan." }, { status: 401 });
    }

    const serverKey = process.env.MIDTRANS_SERVER_KEY?.trim();
    if (IPAYMU && !konfigIpaymu().siap) {
      console.error("[payment] IPAYMU_VA / IPAYMU_API_KEY belum di-set");
      return NextResponse.json({ error: "Pembayaran belum aktif. Hubungi kami dulu ya." }, { status: 503 });
    }
    if (!IPAYMU && !serverKey) {
      /* Kejadian nyata sebelumnya: env-nya gak pernah di-set, dan kodenya
         nembak Midtrans pakai `undefined` — signature-nya gak akan pernah
         cocok, dan errornya cuma kelihatan di log. Ditolak di depan aja. */
      console.error("[payment] MIDTRANS_SERVER_KEY belum di-set");
      return NextResponse.json({ error: "Pembayaran belum aktif. Hubungi kami dulu ya." }, { status: 503 });
    }

    const { data: profil } = await supabase
      .from("profiles").select("username").eq("id", user.id).single();

    const orderId = buatOrderId(paket.id);

    /* Dicatat SEBELUM ke Midtrans. Webhook nanti nyari pemiliknya lewat baris
       ini — bukan nebak dari potongan uuid di order_id. */
    const { error: eTx } = await admin().from("transaksi").insert({
      order_id: orderId,
      user_id: user.id,
      paket_id: paket.id,
      jumlah: paket.harga,
      status: "pending",
    });
    if (eTx) {
      console.error("[payment] gagal nyatat transaksi:", eTx.message);
      return NextResponse.json({ error: "Gagal memulai pembayaran. Coba lagi." }, { status: 500 });
    }

    /* Cuma kepakai di sini — sisi server. Prefix NEXT_PUBLIC_ itu salah kaprah
       dari awal (Vercel nolak nandain variabel ber-prefix itu sebagai Secret,
       karena nilainya memang dikirim ke browser). SITE_URL yang bener; nama
       lamanya tetap dibaca supaya deployment yang udah nyetel itu gak pecah. */
    const situs = (process.env.SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "")
      .replace(/\/$/, "");

    if (IPAYMU) {
      /* iPaymu butuh URL lengkap buat balik & ngabarin — tanpa SITE_URL,
         uang bisa masuk tapi kabarnya gak pernah sampai. */
      if (!/^https?:\/\//.test(situs)) {
        console.error("[payment] SITE_URL belum di-set — iPaymu gak bisa ngabarin hasil bayar");
        await admin().from("transaksi").update({ status: "gagal", diperbarui: new Date().toISOString() }).eq("order_id", orderId);
        return NextResponse.json({ error: "Pembayaran belum aktif. Hubungi kami dulu ya." }, { status: 503 });
      }
      const { ok, hasil } = await buatPembayaranIpaymu({
        orderId, nama: paket.nama, ringkas: paket.ringkas, harga: paket.harga,
        pembeli: { nama: profil?.username || user.email?.split("@")[0] || "Pengguna", email: user.email },
        returnUrl: `${situs}/premium/sukses?order_id=${orderId}`,
        cancelUrl: `${situs}/premium`,
        notifyUrl: `${situs}/api/payment/webhook/ipaymu`,
      });
      if (!ok || !hasil.Data?.Url) {
        console.error("[payment] iPaymu nolak:", hasil);
        await admin().from("transaksi")
          .update({ status: "gagal", midtrans: { gateway: "ipaymu", tolak: hasil }, diperbarui: new Date().toISOString() })
          .eq("order_id", orderId);
        return NextResponse.json({ error: "Gagal membuat transaksi. Coba lagi." }, { status: 502 });
      }
      /* SessionID disimpan buat dicocokin waktu iPaymu ngabarin hasilnya.
         (Kolomnya masih bernama `midtrans` — isinya payload gateway mentah.) */
      await admin().from("transaksi")
        .update({ midtrans: { gateway: "ipaymu", sesi: hasil.Data.SessionID } })
        .eq("order_id", orderId);
      return NextResponse.json({ gateway: "ipaymu", url: hasil.Data.Url, order_id: orderId });
    }

    const res = await fetch(SNAP_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: "Basic " + Buffer.from(serverKey! + ":").toString("base64"),
      },
      body: JSON.stringify({
        transaction_details: { order_id: orderId, gross_amount: paket.harga },
        item_details: [{ id: paket.id, name: paket.nama.slice(0, 50), price: paket.harga, quantity: 1 }],
        customer_details: {
          email: user.email,
          first_name: profil?.username || user.email?.split("@")[0] || "Pengguna",
        },
        callbacks: { finish: `${situs}/premium/sukses?order_id=${orderId}` },
      }),
    });

    const hasil = await res.json();
    if (!res.ok) {
      console.error("[payment] Midtrans nolak:", hasil);
      await admin().from("transaksi")
        .update({ status: "gagal", midtrans: hasil, diperbarui: new Date().toISOString() })
        .eq("order_id", orderId);
      return NextResponse.json({ error: "Gagal membuat transaksi. Coba lagi." }, { status: 502 });
    }

    return NextResponse.json({
      token: hasil.token,
      redirect_url: hasil.redirect_url,
      order_id: orderId,
      /* Client key aman dikirim ke browser — memang dipakai di sisi klien
         buat Snap.js. Server key TIDAK boleh ikut. */
      client_key: process.env.MIDTRANS_CLIENT_KEY ?? "",
      produksi: PRODUKSI,
    });
  } catch (e) {
    console.error("[payment] error:", e);
    return NextResponse.json({ error: "Ada yang salah. Coba lagi." }, { status: 500 });
  }
}
