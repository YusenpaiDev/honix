import type { Metadata } from "next";
import type { ReactNode } from "react";
import { connection } from "next/server";
import {
  Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, BookOpen, Bot, CheckCircle2, Coins, Crown,
  FileWarning, Flame, RefreshCw, Repeat, Sparkles, TrendingUp, Users, Wallet,
} from "lucide-react";
import { wajibAdmin } from "@/lib/admin/akses";
import { ambilDasbor, type DasborAdmin } from "@/lib/admin/data";
import { dasborContoh } from "@/lib/admin/contoh";
import { jalurArea, perluDicek, tren, type Nada, type PerHari } from "@/lib/admin/tampil";
import { PAKET, adalahPaket } from "@/lib/paket";
import "./admin.css";

export const metadata: Metadata = { title: "Admin · Honix JLPT", robots: { index: false, follow: false } };

const rp = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
const angka = (n: number) => n.toLocaleString("id-ID");
const tgl = (iso: string) => new Date(iso).toLocaleString("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const tglPendek = (ymd: string) => new Date(`${ymd}T12:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
/* Nama dari paket.ts dibuang awalan "Honix JLPT" — langganan.ts punya versi
   pendeknya, tapi itu modul "use client" (gak bisa dipanggil dari server). */
const namaPendek = (id: string) => (adalahPaket(id) ? PAKET[id].nama.replace(/^Honix JLPT /, "") : id);
const NAMA_FITUR: Record<string, string> = { chat: "Chat Sensei", furigana: "Furigana", "tugas-generate": "Lembar tugas AI" };
const LEVEL = ["N1", "N2", "N3", "N4", "N5"] as const;
const KATEGORI = ["文字", "語彙", "文法", "読解"] as const;
const URUT_STATUS = ["lunas", "pending", "gagal", "kadaluarsa", "refund"];

/* ───────── potongan kecil ───────── */

function Tren({ data, label = "vs 7 hari lalu" }: { data: PerHari; label?: string }) {
  const t = tren(data);
  if (t.persen == null) return <span className="adm-tren datar">{t.ini ? `+${angka(t.ini)} minggu ini` : "belum ada minggu ini"}</span>;
  const naik = t.persen >= 0;
  return (
    <span className={`adm-tren ${naik ? "naik" : "turun"}`}>
      {naik ? <ArrowUpRight size={13} aria-hidden /> : <ArrowDownRight size={13} aria-hidden />}
      {naik ? "+" : ""}{t.persen}% <em>{label}</em>
    </span>
  );
}

function Kpi({ ikon, warna, label, nilai, bawah, nada }: {
  ikon: ReactNode; warna: string; label: string; nilai: string; bawah?: ReactNode; nada?: Nada;
}) {
  return (
    <div className={`adm-kpi${nada ? ` ${nada}` : ""}`} style={{ ["--c" as string]: warna }}>
      <div className="adm-kpi-l"><span className="adm-ic">{ikon}</span>{label}</div>
      <strong>{nilai}</strong>
      {bawah && <div className="adm-kpi-b">{bawah}</div>}
    </div>
  );
}

function Sek({ id, ikon, judul, meta, children }: { id: string; ikon: ReactNode; judul: string; meta?: ReactNode; children: ReactNode }) {
  return (
    <section className="adm-sek" aria-labelledby={`${id}-h`} id={id}>
      <header className="adm-sek-h">
        <h2 id={`${id}-h`}><span className="adm-ic kecil">{ikon}</span>{judul}</h2>
        {meta && <span className="adm-sek-meta">{meta}</span>}
      </header>
      {children}
    </section>
  );
}

function Panel({ judul, kanan, className = "", children }: { judul?: string; kanan?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <div className={`adm-panel ${className}`}>
      {(judul || kanan) && <div className="adm-panel-h">{judul && <h3>{judul}</h3>}{kanan}</div>}
      {children}
    </div>
  );
}

/** Grafik area 30 hari: garis bantu + sumbu, tooltip per hari lewat <title>. */
function Grafik({ data, label, warna = "var(--primary)" }: { data: PerHari; label: string; warna?: string }) {
  const W = 600, H = 160;
  const { atas, garis, area, titik } = jalurArea(data, W, H);
  const lebarKolom = data.length ? W / data.length : W;
  const idGrad = `g-${label.replace(/\W/g, "")}`;
  const total = data.reduce((s, d) => s + d.n, 0);
  return (
    <figure className="adm-grafik" aria-label={`${label}: total ${total} dalam ${data.length} hari`} style={{ ["--c" as string]: warna }}>
      <div className="adm-grafik-isi">
        <div className="adm-sumbu" aria-hidden>
          {[atas, atas / 2, 0].map(v => <span key={v}>{angka(Math.round(v))}</span>)}
        </div>
        <div className="adm-kanvas">
          <i className="adm-bantu" style={{ top: 0 }} /><i className="adm-bantu" style={{ top: "50%" }} /><i className="adm-bantu dasar" style={{ top: "100%" }} />
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden>
            <defs>
              <linearGradient id={idGrad} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={warna} stopOpacity=".38" />
                <stop offset="1" stopColor={warna} stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={area} fill={`url(#${idGrad})`} />
            <path d={garis} fill="none" stroke={warna} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            {titik.map(t => (
              <rect key={t.tanggal} x={Math.max(0, t.x - lebarKolom / 2)} y={0} width={lebarKolom} height={H} fill="transparent" className="adm-kolom">
                <title>{`${tglPendek(t.tanggal)}: ${t.n}`}</title>
              </rect>
            ))}
          </svg>
          {titik.length > 0 && (
            <span className="adm-titik-akhir" style={{ left: "100%", top: `${(titik[titik.length - 1].y / H) * 100}%` }} aria-hidden />
          )}
        </div>
      </div>
      <figcaption>
        <span>{data[0] && tglPendek(data[0].tanggal)}</span>
        <span>{data[15] && tglPendek(data[15].tanggal)}</span>
        <span>Hari ini</span>
      </figcaption>
    </figure>
  );
}

function Status({ s }: { s: string }) {
  return <span className={`adm-chip st-${s}`}><i />{s.toUpperCase()}</span>;
}

/* ───────── halaman ───────── */

/**
 * Dasbor admin — cuma email di ADMIN_EMAILS (selain itu 404). Gak ada link di
 * menu. Di mode dev bypass pakai data contoh, gak nyentuh DB.
 */
export default async function AdminPage() {
  await connection();
  const devBypass = process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === "1";
  let d: DasborAdmin;
  if (devBypass) d = dasborContoh();
  else { await wajibAdmin(); d = await ambilDasbor(); }
  const { user, uang, pemakaian, konten } = d;
  const totalSet = pemakaian.setPerHari.reduce((s, x) => s + x.n, 0);
  const totalLevel = Math.max(1, Object.values(user.perLevel).reduce((a, b) => a + b, 0));
  const totalAiMinggu = Object.values(pemakaian.ai).reduce((s, a) => s + a.minggu, 0);
  const maksAi = Math.max(1, ...Object.values(pemakaian.ai).map(a => a.minggu));
  const maksPopuler = Math.max(1, ...pemakaian.populer.map(p => p.n));
  const totalTx = Object.values(uang.perStatus).reduce((a, b) => a + b, 0);
  const statusUrut = Object.entries(uang.perStatus).sort((a, b) => URUT_STATUS.indexOf(a[0]) - URUT_STATUS.indexOf(b[0]));
  const maksSel = Math.max(1, ...Object.values(konten.bankSoal).flatMap(k => Object.values(k)));
  const bankKosong = Object.entries(konten.bankSoal).flatMap(([l, k]) => KATEGORI.filter(c => !(k[c] ?? 0)).map(c => `${l} ${c}`));
  const cek = perluDicek({
    pendingNyangkut: uang.pendingNyangkut, errorHari: d.error?.hari ?? null, sesiReview: konten.sesiReview,
    segeraHabis: uang.segeraHabis, bankKosong,
  });

  return (
    <main className="adm">
      <div className="adm-cahaya" aria-hidden />

      <header className="adm-head">
        <div className="adm-head-l">
          {/* eslint-disable-next-line @next/next/no-img-element -- aset statis kecil, gak perlu optimasi */}
          <img src="/honix/09-kepala.png" alt="" width={52} height={52} className="adm-maskot" />
          <div>
            <p className="adm-kicker">Honix JLPT · Admin</p>
            <h1>Dasbor</h1>
            <p className="adm-waktu">Diperbarui {tgl(d.dibuat)} WIB{devBypass && <b> · data contoh (dev)</b>}</p>
          </div>
        </div>
        <a className="adm-btn" href="/admin"><RefreshCw size={15} aria-hidden /> Muat ulang</a>
      </header>

      {/* Perlu dicek */}
      {cek.length ? (
        <div className="adm-cek" role="region" aria-label="Perlu dicek">
          <div className="adm-cek-h"><AlertTriangle size={16} aria-hidden /> Perlu dicek <b>{cek.length}</b></div>
          <div className="adm-cek-isi">
            {cek.map(c => (
              <a key={c.judul} href={c.ke} className={`adm-cek-item ${c.nada}`}>
                <i />
                <span><b>{c.judul}</b><em>{c.ket}</em></span>
              </a>
            ))}
          </div>
        </div>
      ) : (
        <div className="adm-cek aman"><CheckCircle2 size={16} aria-hidden /> Semua aman — gak ada transaksi nyangkut, error, atau soal yang perlu dibetulin.</div>
      )}

      {/* Angka utama */}
      <div className="adm-kpis">
        <Kpi ikon={<Users size={15} />} warna="#E8704F" label="Total user" nilai={angka(user.total)}
          bawah={<><span className="adm-plus">+{angka(user.baru7)} minggu ini</span><Tren data={user.daftarPerHari} /></>} />
        <Kpi ikon={<Activity size={15} />} warna="#8FCB52" label="Aktif hari ini" nilai={angka(user.aktifHariIni)}
          bawah={<span className="adm-redup">{angka(user.aktif7)} aktif 7 hari · {Math.round((user.aktif7 / Math.max(1, user.total)) * 100)}% dari total</span>} />
        <Kpi ikon={<Wallet size={15} />} warna="#D4A04A" label="Pendapatan bulan ini" nilai={rp(uang.pendapatanBulanIni)}
          bawah={<span className="adm-redup">Total sepanjang masa {rp(uang.pendapatanTotal)}</span>} />
        <Kpi ikon={<Crown size={15} />} warna="#B98BBA" label="Pro aktif" nilai={angka(uang.proAktif)} nada={uang.segeraHabis ? "warn" : undefined}
          bawah={<span className="adm-redup">{angka(uang.lifetime)} lifetime · {angka(uang.whitelist)} whitelist{uang.segeraHabis ? ` · ${angka(uang.segeraHabis)} habis ≤7 hari` : ""}</span>} />
      </div>

      {/* User */}
      <Sek id="adm-user" ikon={<Users size={14} />} judul="User" meta={`${angka(user.baru30)} daftar dalam 30 hari`}>
        <div className="adm-dua lebar-kiri">
          <Panel judul="User baru per hari" kanan={<Tren data={user.daftarPerHari} />}>
            <Grafik data={user.daftarPerHari} label="User baru per hari" />
          </Panel>
          <Panel judul="Level target" kanan={<span className="adm-redup">{angka(totalLevel)} user</span>}>
            <div className="adm-level">
              {LEVEL.map(l => {
                const n = user.perLevel[l] ?? 0;
                return (
                  <div key={l} className="adm-level-baris" style={{ ["--c" as string]: `var(--${l.toLowerCase()})` }}>
                    <span className="adm-lv">{l}</span>
                    <div className="adm-trek"><i style={{ width: `${(n / totalLevel) * 100}%` }} /></div>
                    <b>{angka(n)}</b><em>{Math.round((n / totalLevel) * 100)}%</em>
                  </div>
                );
              })}
            </div>
            <div className="adm-mini">
              <span><Sparkles size={13} aria-hidden /> Baru 7 hari <b>{angka(user.baru7)}</b></span>
              <span className={user.belumOnboarding ? "warn" : ""}><Flame size={13} aria-hidden /> Belum onboarding <b>{angka(user.belumOnboarding)}</b></span>
            </div>
          </Panel>
        </div>
      </Sek>

      {/* Uang */}
      <Sek id="adm-uang" ikon={<Coins size={14} />} judul="Uang & Pro" meta={`${angka(totalTx)} transaksi tercatat`}>
        <div className="adm-dua">
          <Panel judul="Status transaksi">
            {totalTx ? (
              <>
                <div className="adm-tumpuk" role="img" aria-label={statusUrut.map(([s, n]) => `${s} ${n}`).join(", ")}>
                  {statusUrut.map(([s, n]) => <i key={s} className={`st-${s}`} style={{ flexGrow: n }} title={`${s.toUpperCase()} ${n}`} />)}
                </div>
                <div className="adm-legenda">
                  {statusUrut.map(([s, n]) => (
                    <span key={s} className={`st-${s}`}><i />{s.charAt(0).toUpperCase() + s.slice(1)}<b>{angka(n)}</b><em>{Math.round((n / totalTx) * 100)}%</em></span>
                  ))}
                </div>
              </>
            ) : <p className="adm-kosong">Belum ada transaksi.</p>}
          </Panel>
          <Panel judul="Penjualan per paket" kanan={<span className="adm-redup">yang LUNAS</span>}>
            {Object.keys(uang.perPaket).length ? (
              <div className="adm-paket">
                {Object.entries(uang.perPaket).sort((a, b) => b[1].rp - a[1].rp).map(([p, v]) => (
                  <div key={p} className="adm-paket-item">
                    <span>{namaPendek(p)}</span>
                    <strong>{rp(v.rp)}</strong>
                    <em>{angka(v.n)}× terjual</em>
                  </div>
                ))}
              </div>
            ) : <p className="adm-kosong">Belum ada penjualan.</p>}
          </Panel>
        </div>
        <Panel judul="10 transaksi terakhir" className="adm-gulir">
          {uang.terakhir.length ? (
            <table className="adm-tabel">
              <thead><tr><th>Nomor pesanan</th><th>User</th><th>Paket</th><th className="kanan">Jumlah</th><th>Status</th><th>Waktu</th></tr></thead>
              <tbody>
                {uang.terakhir.map(t => (
                  <tr key={t.order_id}>
                    <td className="mono">{t.order_id}</td><td>{t.email ?? "—"}</td>
                    <td>{namaPendek(t.paket_id)}</td><td className="kanan angka">{rp(t.jumlah)}</td>
                    <td><Status s={t.status} /></td><td className="adm-redup">{tgl(t.dibuat)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="adm-kosong">Belum ada transaksi.</p>}
        </Panel>
      </Sek>

      {/* Pemakaian */}
      <Sek id="adm-pakai" ikon={<TrendingUp size={14} />} judul="Pemakaian" meta="30 hari terakhir">
        <div className="adm-kpis tiga">
          <Kpi ikon={<BookOpen size={15} />} warna="#E8704F" label="Set dikerjain" nilai={angka(totalSet)} bawah={<Tren data={pemakaian.setPerHari} />} />
          <Kpi ikon={<CheckCircle2 size={15} />} warna="#8FCB52" label="Soal dijawab" nilai={angka(pemakaian.soalDijawab)} bawah={<span className="adm-redup">dari set yang udah dinilai</span>} />
          <Kpi ikon={<Bot size={15} />} warna="#6FA8C9" label="Panggilan AI (7 hari)" nilai={angka(totalAiMinggu)} bawah={<span className="adm-redup">{angka(pemakaian.penggunaAiHariIni)} user pakai AI hari ini</span>} />
        </div>
        <div className="adm-dua lebar-kiri">
          <Panel judul="Set dikerjain per hari" kanan={<Tren data={pemakaian.setPerHari} />}>
            <Grafik data={pemakaian.setPerHari} label="Set dikerjain per hari" warna="#E8704F" />
          </Panel>
          <div className="adm-tumpukan">
            <Panel judul="Pemakaian AI" kanan={<span className="adm-redup">hari ini · 7 hari</span>}>
              <div className="adm-ai">
                {Object.entries(pemakaian.ai).map(([f, a]) => (
                  <div key={f} className="adm-ai-baris">
                    <span>{NAMA_FITUR[f] ?? f}</span>
                    <div className="adm-trek"><i style={{ width: `${(a.minggu / maksAi) * 100}%` }} /></div>
                    <b>{angka(a.hariIni)}</b><b>{angka(a.minggu)}</b>
                  </div>
                ))}
              </div>
            </Panel>
            <Panel judul="Set paling sering dikerjain" kanan={<span className="adm-redup">30 hari</span>}>
              {pemakaian.populer.length ? (
                <ol className="adm-populer">
                  {pemakaian.populer.map((p, i) => (
                    <li key={p.title}>
                      <span className="adm-rank">{i + 1}</span>
                      <span className="jp adm-populer-j">{p.title}</span>
                      <div className="adm-trek"><i style={{ width: `${(p.n / maksPopuler) * 100}%` }} /></div>
                      <b>{angka(p.n)}×</b>
                    </li>
                  ))}
                </ol>
              ) : <p className="adm-kosong">Belum ada set dikerjain.</p>}
            </Panel>
          </div>
        </div>
      </Sek>

      {/* Konten */}
      <Sek id="adm-konten" ikon={<BookOpen size={14} />} judul="Konten & kesehatan" meta={`${angka(konten.totalBankSoal)} soal di bank`}>
        <div className="adm-dua lebar-kiri">
          <Panel judul="Bank soal per level & kategori" className="adm-gulir">
            <table className="adm-tabel adm-matriks">
              <thead><tr><th />{KATEGORI.map(c => <th key={c} className="jp">{c}</th>)}<th>Total</th></tr></thead>
              <tbody>
                {Object.entries(konten.bankSoal).map(([l, k]) => {
                  const total = Object.values(k).reduce((a, b) => a + b, 0);
                  return (
                    <tr key={l}>
                      <th><span className="adm-lv" style={{ ["--c" as string]: `var(--${l.toLowerCase()})` }}>{l}</span></th>
                      {KATEGORI.map(c => {
                        const n = k[c] ?? 0;
                        return <td key={c} className={n ? "" : "nol"} style={n ? { ["--a" as string]: (0.08 + (n / maksSel) * 0.42).toFixed(2) } : undefined}>{n ? angka(n) : "0"}</td>;
                      })}
                      <td className="tot">{angka(total)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Panel>
          <div className="adm-tumpukan isi">
            <Kpi ikon={<FileWarning size={15} />} warna="#D4A04A" label="Sesi dengan soal REVIEW"
              nilai={konten.sesiReview == null ? "—" : angka(konten.sesiReview)} nada={konten.sesiReview ? "warn" : undefined}
              bawah={<span className="adm-redup">{konten.sesiReview == null ? "Gagal dihitung" : konten.sesiReview ? "Cek & betulin teks soalnya" : "Gak ada yang ditandai"}</span>} />
            <Kpi ikon={<AlertTriangle size={15} />} warna="#E0566F" label="Error 24 jam"
              nilai={d.error == null ? "—" : angka(d.error.hari)} nada={d.error == null ? undefined : d.error.hari ? "bad" : "ok"}
              bawah={<span className="adm-redup">{d.error == null ? "Jalankan migration error_log dulu" : d.error.hari ? "Lihat daftar di bawah" : "Aman"}</span>} />
          </div>
        </div>
      </Sek>

      {d.gantiTarget && (
        <Sek id="adm-target" ikon={<Repeat size={14} />} judul="Ganti target" meta={d.gantiTarget.length ? `${d.gantiTarget.length} terakhir` : undefined}>
          <Panel className="adm-gulir">
            {d.gantiTarget.length === 0 ? <p className="adm-kosong">Belum ada yang ganti target.</p> : (
              <table className="adm-tabel">
                <thead><tr><th>Waktu</th><th>Akun</th><th>Level</th><th>Alasan</th></tr></thead>
                <tbody>
                  {d.gantiTarget.map(g => (
                    <tr key={g.id}>
                      <td className="adm-redup">{tgl(g.dibuat)}</td>
                      <td className="mono">{g.email ?? "—"}</td>
                      <td><span className="adm-pindah">{g.dari ?? "?"} <span aria-hidden>→</span><span className="sr-only">ke</span> {g.ke}</span></td>
                      <td className="adm-pesan">{g.alasan}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>
        </Sek>
      )}

      {d.error && d.error.terbaru.length > 0 && (
        <Sek id="adm-error" ikon={<AlertTriangle size={14} />} judul="Error terbaru">
          <Panel className="adm-gulir">
            <table className="adm-tabel">
              <thead><tr><th>Waktu</th><th>Sumber</th><th>Halaman</th><th>Pesan</th></tr></thead>
              <tbody>
                {d.error.terbaru.map((e, i) => (
                  <tr key={i}>
                    <td className="adm-redup">{tgl(e.waktu)}</td>
                    <td><span className={`adm-chip ${e.sumber === "server" ? "st-gagal" : "st-pending"}`}><i />{e.sumber.toUpperCase()}</span></td>
                    <td className="mono">{e.path ?? e.rute ?? "—"}</td>
                    <td className="adm-pesan mono">{e.pesan}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        </Sek>
      )}
    </main>
  );
}
