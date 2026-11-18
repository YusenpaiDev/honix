"use client";

import { loadSessionPages } from "@/lib/session-data";
import { judulSet } from "@/lib/judul-set";

import { activityAt, hasPracticeDate, answeredCount, accuracyPercent, dailyActivity, recentPractice } from "@/lib/session-progress";

import { useState, useEffect, useMemo, useRef, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { tanggalLokal } from "@/lib/aktivitas";
import { honixSrc } from "@/lib/honix-pose";
import { useHonix } from "@/lib/use-honix";
import { putarHonix } from "@/lib/honix-sfx";
import { Honix } from "@/components/honix/Honix";
import { KalenderMini } from "@/components/rencana/KalenderMini";
import { MisiHarian } from "@/components/rencana/MisiHarian";
import { KilatHarian } from "@/components/beranda/KilatHarian";
import { AjakanDiscord } from "@/components/beranda/AjakanDiscord";
import { bukaCaraBelajar } from "@/components/alur/CaraBelajar";
import "@/styles/alur.css";
import { PerkiraanMini, type SesiSkor } from "@/components/kurikulum/Perkiraan";
import { fiturLive } from "@/lib/kurikulum-config";
import { devBeranda, type BerandaMentah } from "@/lib/dev-beranda";
import { AuroraBackground, NavRail, BottomNav, PeringatanBanner } from "@/components/v2";
import { useUserStats } from "@/lib/use-user-stats";
import { daftarSesiUjian, hariMenuju, labelSesi } from "@/lib/sesi-ujian";
import { PengingatPro } from "@/components/pembayaran/PengingatPro";
import { hariKe, type KanjiHarian } from "@/lib/kanji-harian";
import { bacaCache, simpanCache } from "@/lib/cache-lokal";
import { uidLokal } from "@/lib/uid-lokal";

interface Session {
  id: string;
  level: string;
  category: string;
  title: string;
  total: number;
  score: number | null;
  created_at: string;
  section?: string | null;
  stats?: { answered: number; correct: number; perCat?: Record<string, { a: number; c: number }> } | null;
  kind?: string | null;
}

/* 5 kategori — urutan tampilan sama kayak desain */
const FOCUS_CATS = [
  { jp: "文字", ro: "Moji" }, { jp: "語彙", ro: "Goi" }, { jp: "文法", ro: "Bunpou" },
  { jp: "読解", ro: "Dokkai" }, { jp: "聴解", ro: "Choukai" },
];
const DAY_LETTER = ["M", "S", "S", "R", "K", "J", "S"]; // getDay 0=Minggu … 6=Sabtu
type Focus = { jp: string; ro: string; pct: number | null; n: number };
type WeekDay = { d: string; h: number; v: number; now: boolean };

const categoryGlyph: Record<string, string> = { "文法": "文", "語彙": "語", "文字": "字", "読解": "読", "AI": "全" };
/* warna glyph riwayat per section/kategori */
function riwStyle(s: Session): { bg: string; bd: string; fg: string; g: string } {
  if (s.section === "choukai") return { bg: "rgba(107,125,92,0.16)", bd: "rgba(107,125,92,0.45)", fg: "#92A67F", g: "聴" };
  const map: Record<string, [string, string, string, string]> = {
    "読解": ["rgba(184,84,80,0.14)", "rgba(184,84,80,0.4)", "#D07E7A", "読"],
    "文法": ["rgba(74,124,126,0.14)", "rgba(74,124,126,0.4)", "#6FA5A7", "文"],
    "語彙": ["rgba(139,90,140,0.16)", "rgba(139,90,140,0.4)", "#B583B6", "語"],
    "文字": ["rgba(199,123,63,0.14)", "rgba(199,123,63,0.4)", "#C77B3F", "字"],
  };
  const [bg, bd, fg, g] = map[s.category] ?? ["rgba(212,160,74,0.14)", "rgba(212,160,74,0.4)", "#D4A04A", categoryGlyph[s.category] ?? "全"];
  return { bg, bd, fg, g };
}
function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000), hours = Math.floor(diff / 3_600_000), days = Math.floor(diff / 86_400_000);
  if (mins < 1) return "baru saja";
  if (mins < 60) return `${mins} menit lalu`;
  if (hours < 24) return `Hari ini`;
  if (days === 1) return "kemarin";
  return `${days} hari lalu`;
}
const scorePct = (s: Session) => (s.score != null && s.total > 0 ? Math.round((s.score / s.total) * 100) : null);

/* Kamus (kanji harian + daftar kata/pola per level) diambil dari route statis
   /kamus-ringkas/*, BUKAN diimport. Dulu 5 file kotoba (2,3 MB) keimport di
   sini dan jadi ~80% JS Beranda — padahal yang kepake cuma 1 kanji sehari &
   daftar kata satu level. */
type RingkasLevel = { kata: string[]; pola: string[] };

/* Salinan isi Beranda buat tampilan instan (lihat cache-lokal.ts). */
const CACHE_BERANDA = "beranda-v1";
interface SalinanBeranda {
  tanggal: string;
  name: string; loveNote: string | null; avatar: string | null;
  kotoba: number | null;
  progKotoba: { n: number; total: number } | null;
  progBunpou: { n: number; total: number; salah: number } | null;
  kanjiSalah: { kanji: string[]; salah: number } | null;
  sessionError: boolean;
  sessions: Session[]; semuaSesi: SesiSkor[];
  totalSoal: number; resume: Session | null; avgScore: number | null;
  focus: Focus[]; week: WeekDay[]; hariIni: number; activeDays: number;
  delta: { soalMinggu: number; akurasiBulan: number | null; kotobaMinggu: number | null; aktivitas: number | null };
}
const ambilJson = <T,>(url: string): Promise<T | null> =>
  fetch(url).then(r => (r.ok ? r.json() as Promise<T> : null)).catch(() => null);

/* Kanji Sering Salah — diturunin dari salah per kata (kotoba_progress):
   kata yang salahnya ≥ benarnya dipecah jadi huruf kanji, tiap kanji dapet
   skor = jumlah salah katanya. Ambil 3 teratas. Data "ketuker sama kanji
   apa" gak ada, jadi ini frekuensi, bukan pasangan mirip. */
function kanjiSeringSalah(rows: { word: string; benar: number; salah: number }[]) {
  const skor = new Map<string, number>();
  for (const r of rows) {
    if (r.salah < 1 || r.salah < r.benar) continue;
    for (const k of new Set(r.word.match(/[\u4e00-\u9fbf]/g) ?? [])) skor.set(k, (skor.get(k) ?? 0) + r.salah);
  }
  const atas = [...skor.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  if (!atas.length) return null;
  return { kanji: atas.map(([k]) => k), salah: atas.reduce((s, [, n]) => s + n, 0) };
}

/* Drill buat kategori terlemah di kartu Fokus. */
const DRILL_KATEGORI: Record<string, (lv: string) => string> = {
  "文法": lv => `/latihan/kilat?level=${lv}`,
  "語彙": lv => `/latihan/kotoba?level=${lv}`,
  "文字": lv => `/latihan/kotoba?level=${lv}`,
  "聴解": () => "/choukai",
  "読解": () => "/materi",
};

/* Render contoh kalimat + highlight kanji-nya (#E8704F). */
function renderKjExample(example: string, highlight?: string) {
  if (!highlight || !example.includes(highlight)) return <>{example}</>;
  const i = example.indexOf(highlight);
  return <>{example.slice(0, i)}<span className="hl">{highlight}</span>{example.slice(i + highlight.length)}</>;
}


/* ── Honix di Beranda (HANDOFF-honix §4 "Beranda", mock Beranda Honix Final) ── */

/* Jejak bara di belakang Honix terbang. Nilainya tetap (dari mock), bukan
   acak — halaman ini di-render server juga, nilai acak bikin hydration beda. */
const BARA = [
  [-129, 89, "#FF6A00", 1722, 821], [-126, 26, "#FFC24D", 1991, 1026], [-123, 37, "#FF8C25", 2022, 1205],
  [-162, 59, "#FF6A00", 1701, 416], [-64, 37, "#FFC24D", 2203, 896], [-73, 61, "#FF8C25", 1929, 526],
  [-90, 83, "#FF6A00", 1972, 1126], [-152, 67, "#FFC24D", 2148, 1749], [-137, 22, "#FF8C25", 2175, 1101],
  [-144, 62, "#FF6A00", 1436, 1681], [-79, 88, "#FFC24D", 1867, 1737], [-136, 24, "#FF8C25", 1688, 313],
] as const;

const BANNER_STREAK = (n: number): ReactNode[] => [
  <>Streak naik jadi <b>{n} hari</b>!</>,
  <><b>{n} hari</b> berturut-turut. Hebat!</>,
  <>Satu hari lagi, apinya makin besar. <b>{n} hari</b>!</>,
];
/* Penanda "banner streak naik udah tampil hari ini" — sekali per hari. */
const LS_STREAK_NAIK = "honix-streak-naik";

function labelJam(h: number) {
  return h < 11 ? "Selamat pagi" : h < 15 ? "Selamat siang" : h < 18 ? "Selamat sore" : "Selamat malam";
}

/* Mode dev tanpa login (lihat src/lib/dev-beranda.ts). Sengaja ditulis
   langsung di file ini, bukan diimport: Next cuma bisa ganti env jadi
   literal & buang cabangnya kalau ekspresinya ada di modul yang sama. */
const DEV_BYPASS = process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === "1";

/* Sapaan spesial per orang 💕 (nama + pesan manis di Beranda). */
const SPECIAL: Record<string, { name: string; note: string }> = {
  "azizatulaini70@gmail.com": {
    name: "Ai-chan",
    note: "がんばってね、アイちゃん 💕 — belajar bareng terus ya, kamu pasti bisa. いつも応援してるよ、ゆうちゃんより 🥰",
  },
};

/* Waktu di kartu Lanjutin, format mock: "kemarin 21:14" / "hari ini 08:02". */
function waktuLanjut(iso: string): string {
  const d = new Date(iso), kini = new Date();
  const jamnya = d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }).replace(".", ":");
  const hari = Math.round((new Date(kini.toDateString()).getTime() - new Date(d.toDateString()).getTime()) / 86_400_000);
  return hari === 0 ? `hari ini ${jamnya}` : hari === 1 ? `kemarin ${jamnya}` : `${hari} hari lalu`;
}

/* Baris kecil di kartu Lanjutin (mock: "Berhenti di soal 42/75 kemarin 21:14
   ▬▬ 56%"). Skor kalau sesinya udah kelar. */
function ResumeSub({ s }: { s: Session }) {
  const dijawab = Math.min(s.stats?.answered ?? 0, s.total);
  const pct = scorePct(s);
  if (s.score == null && dijawab > 0 && s.total > 0) {
    const p = Math.round(dijawab / s.total * 100);
    return (
      <div className="res-s">
        Berhenti di soal {dijawab}/{s.total} {hasPracticeDate(s) ? waktuLanjut(activityAt(s)) : ""}
        <span className="res-bar"><i style={{ width: `${p}%` }} /></span>
        {p}%
      </div>
    );
  }
  return <div className="res-s">{pct != null ? `Terakhir ${pct}%` : "Belum kamu kerjain"} · {hasPracticeDate(s) ? waktuLanjut(activityAt(s)) : ""}</div>;
}

/* Jenis sesi buat judul kartu Lanjutin (mock: "… — Bank Soal"). */
function jenisSesi(s: Session): string {
  if (s.section === "choukai") return "Choukai";
  if (s.kind === "drill") return "Drill";
  if (s.kind === "tes_mini") return "Tes mini";
  return "Bank Soal";
}

/* Data mentah Beranda dari Supabase. null = belum login. */
async function ambilMentah(now: Date): Promise<BerandaMentah | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const seminggu = new Date(now.getTime() - 7 * 86_400_000).toISOString();

  const [profileRes, sessionRes, kotobaRes, kotobaMingguRes, aktifRes, kpRes, bpRes] = await Promise.all([
    supabase.from("profiles").select("avatar_url").eq("id", user.id).single(),
    loadSessionPages((from,to) => supabase.from("sessions").select("id,level,category,title,total,score,created_at,ai_result->section,ai_result->stats,ai_result->kind")
      .eq("user_id", user.id).order("created_at", { ascending: false }).order("id").range(from,to)),
    supabase.from("saved_words").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("saved_words").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", seminggu),
    /* Hari aktif terakhir — sumber yang sama dengan streak_saya(). */
    supabase.from("aktivitas_harian").select("tanggal,jumlah").eq("user_id", user.id)
      .order("tanggal", { ascending: false }).limit(14),
    supabase.from("kotoba_progress").select("word, benar, salah").eq("user_id", user.id),
    supabase.from("bunpou_progress").select("pattern, benar, salah").eq("user_id", user.id),
  ]);

  const first = (user.user_metadata?.full_name || user.email || "Yusuf").split(/[ @]/)[0];
  return {
    email: user.email ?? "",
    nama: first,
    // dari user_metadata dulu (Google OAuth), ditimpa profiles.avatar_url kalau ada
    avatar: profileRes.data?.avatar_url ?? user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? null,
    sessions: (sessionRes.data ?? []) as Record<string, unknown>[],
    sessionError: Boolean(sessionRes.error),
    kotobaTotal: kotobaRes.count ?? null,
    kotobaMingguIni: kotobaMingguRes.count ?? null,
    aktifTerakhir: aktifRes.data?.[0]?.tanggal ?? null,
    aktivitasHarian: aktifRes.error ? null : aktifRes.data ?? [],
    kotobaProgres: (kpRes.data ?? []) as BerandaMentah["kotobaProgres"],
    bunpouProgres: ((bpRes.data ?? []) as { pattern: string; benar: number | null; salah: number | null }[])
      .map(r => ({ pattern: r.pattern, benar: r.benar ?? 0, salah: r.salah ?? 0 })),
  };
}

export default function Home() {
  const stats = useUserStats();
  const [sessions, setSessions] = useState<Session[]>([]);
  /* Semua sesi (bukan cuma 4 terakhir) buat perkiraan skor mini. */
  const [semuaSesi, setSemuaSesi] = useState<SesiSkor[]>([]);
  /* Streak dari useUserStats → streak_saya(). Sebelumnya tiap halaman baca
     profiles.streak sendiri — kolom yang gak pernah di-update, jadi tiap
     halaman nampilin angka beku yang sama. */
  const streak = stats.streak;
  const [totalSoal, setTotalSoal] = useState(0);
  const [avgScore, setAvgScore] = useState<number | null>(null);
  const [kotoba, setKotoba] = useState<number | null>(null);
  const [resume, setResume] = useState<Session | null>(null);
  const [sessionError, setSessionError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("Yusuf");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [loveNote, setLoveNote] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ date: string; days: number | null; ujian: string | null }>({ date: "", days: null, ujian: null });
  const [kanji, setKanji] = useState<KanjiHarian | null>(null);

  /* Honix */
  const { kurangiGerak } = useHonix();
  const [jam, setJam] = useState("");
  /* Indeks acak buat milih kalimat — diundi di effect (Math.random di render
     bikin hydration beda), dipakai di useMemo bawah. */
  const [acak, setAcak] = useState(0);
  const [hariIni, setHariIni] = useState(0);
  /* Sesi pertama hari ini udah beres & banner belum tampil hari ini. */
  const [kandidatNaik, setKandidatNaik] = useState(false);
  const [faseNaik, setFaseNaik] = useState<null | "naik" | "keluar" | "selesai">(null);
  const [pesanBanner, setPesanBanner] = useState<ReactNode>(null);

  const examLabel = meta.ujian ? labelSesi(meta.ujian) : "";
  const [focus, setFocus] = useState<Focus[]>([]);
  const [week, setWeek] = useState<WeekDay[]>([]);
  const [activeDays, setActiveDays] = useState(0);
  /* Selisih buat teks kecil di kartu stat & aktivitas. null = gak cukup data. */
  const [delta, setDelta] = useState<{ soalMinggu: number; akurasiBulan: number | null; kotobaMinggu: number | null; aktivitas: number | null }>(
    { soalMinggu: 0, akurasiBulan: null, kotobaMinggu: null, aktivitas: null });
  const [progKotoba, setProgKotoba] = useState<{ n: number; total: number } | null>(null);
  const [progBunpou, setProgBunpou] = useState<{ n: number; total: number; salah: number } | null>(null);
  const [kanjiSalah, setKanjiSalah] = useState<{ kanji: string[]; salah: number } | null>(null);

  /* Effect di bawah jalan ulang begitu level/tanggal ujian dari profil kebaca
     (awalnya level bawaan N3). Data Supabase-nya gak tergantung level, jadi
     diambil SEKALI dan dipakai ulang — dulu seluruh riwayat sesi ketarik dua
     kali tiap buka Beranda. `putaran` buang hasil putaran lama yang telat
     selesai, biar progres dek N3 gak nimpa N2. */
  const mentahRef = useRef<Promise<BerandaMentah | null> | null>(null);
  const putaran = useRef(0);

  /* ── Tampilan instan ──
     Semua yang dipajang Beranda dirangkum jadi satu objek. Data segar →
     objek ini → state, dan disalin ke localStorage. Buka berikutnya: salinan
     itu langsung dipajang, data segar nyusul nimpa. Yang tergantung tanggal
     (grafik 7 hari, "hari ini udah N aktivitas") cuma dipakai kalau salinannya
     dari hari ini. */
  const segarRef = useRef(false);
  const terapkan = (x: SalinanBeranda, hariSama = true) => {
    setName(x.name); setLoveNote(x.loveNote); setAvatar(x.avatar);
    setKotoba(x.kotoba); setProgKotoba(x.progKotoba); setProgBunpou(x.progBunpou); setKanjiSalah(x.kanjiSalah);
    setSessionError(x.sessionError); setSessions(x.sessions); setSemuaSesi(x.semuaSesi);
    setTotalSoal(x.totalSoal); setResume(x.resume); setAvgScore(x.avgScore); setFocus(x.focus);
    if (hariSama) { setWeek(x.week); setHariIni(x.hariIni); setActiveDays(x.activeDays); setDelta(x.delta); }
    setLoading(false);
  };
  useEffect(() => {
    if (DEV_BYPASS) return;
    let batal = false;
    uidLokal().then(uid => {
      const c = bacaCache<SalinanBeranda>(CACHE_BERANDA, uid);
      if (!c || batal || segarRef.current) return;
      terapkan(c, c.tanggal === tanggalLokal());
    });
    return () => { batal = true; };
  // sekali pas buka aja — terapkan cuma manggil setter
  }, []);

  useEffect(() => {
    async function load() {
      const ini = ++putaran.current;
      // tanggal + countdown (browser-only → lolos purity)
      const now = new Date();
      const dateStr = now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
      // Tanggal ujian pilihan user; kalau belum milih, sesi JLPT terdekat.
      const ujian = stats.examDate ?? daftarSesiUjian(now, 1)[0].iso;
      const days = Math.max(0, hariMenuju(ujian, now));
      setMeta({ date: dateStr, days, ujian });
      setJam(labelJam(now.getHours()));
      setAcak(Math.floor(Math.random() * 1000));
      /* Kanji Hari Ini jalan sendiri — kartunya gak perlu nunggu data lain. */
      ambilJson<KanjiHarian>(`/kamus-ringkas/kanji/${hariKe(now)}`).then(k => { if (k) setKanji(k); });

      /* Daftar kata/pola level target & data Supabase diambil BARENGAN. Dulu
         kamus bunpou ditunggu dulu baru Supabase mulai — dua antrean
         jaringan yang gak perlu berurutan. */
      const lv = stats.targetLevel;
      const dekP = ambilJson<RingkasLevel>(`/kamus-ringkas/level/${lv}`).then(d => d ?? { kata: [], pola: [] });

      /* Data mentah: Supabase, atau data contoh di mode dev tanpa login. */
      let m: BerandaMentah | null;
      let dek: RingkasLevel;
      if (DEV_BYPASS) {
        const mode = new URLSearchParams(window.location.search).get("dev");
        if (mode === "naik") { try { localStorage.removeItem(LS_STREAK_NAIK); } catch { /* */ } }
        dek = await dekP;
        m = devBeranda(mode, dek);
      } else {
        mentahRef.current ??= ambilMentah(now);
        [m, dek] = await Promise.all([mentahRef.current, dekP]);
      }
      if (ini !== putaran.current) return;
      if (!m) { setLoading(false); return; }

      const special = SPECIAL[m.email.toLowerCase()];

      /* Sesi pertama hari ini → kandidat banner streak naik (sekali sehari). */
      const terakhir = m.aktifTerakhir;
      const hariIniStr = tanggalLokal(now);
      if (terakhir) {
        if (terakhir === hariIniStr) {
          let sudah = false;
          try { sudah = localStorage.getItem(LS_STREAK_NAIK) === hariIniStr; } catch { /* mode privat */ }
          if (!sudah) setKandidatNaik(true);
        }
      }

      /* Kartu shortcut: progres dek level target + kanji sering salah. */
      const setKata = new Set(dek.kata);
      const setPola = new Set(dek.pola);
      const polaku = m.bunpouProgres.filter(r => setPola.has(r.pattern) && r.benar + r.salah > 0);

      const sess = m.sessions as unknown as Session[];
      const practiced = recentPractice(sess);       // sesi yang udah dikerjain
      // Riwayat: sembunyiin import bank soal yang belum dikerjain (materi/riwayat split)
      const riwayat = recentPractice(sess);
      const rata = accuracyPercent;

      /* Selisih: soal minggu ini, akurasi bulan ini vs bulan lalu. */
      const seminggu = now.getTime() - 7 * 86_400_000;
      const awalBulan = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      const awalBulanLalu = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
      const t = (r: Session) => hasPracticeDate(r) ? new Date(activityAt(r)).getTime() : NaN;
      const akBulanIni = rata(practiced.filter(r => t(r) >= awalBulan));
      const akBulanLalu = rata(practiced.filter(r => t(r) >= awalBulanLalu && t(r) < awalBulan));
      const soalMinggu = sess.filter(r => t(r) >= seminggu).reduce((s, r) => s + (r.total ?? 0), 0);

      /* Fokus per-kategori (all-time, dari ai_result.stats.perCat) */
      const catAgg: Record<string, { a: number; c: number }> = {};
      for (const s of sess) {
        for (const [k, v] of Object.entries(s.stats?.perCat ?? {})) {
          const b = (catAgg[k] ??= { a: 0, c: 0 });
          b.a += v.a ?? 0; b.c += v.c ?? 0;
        }
      }

      /* Aktivitas 7 hari terakhir (soal dijawab per hari, dari stats.answered) */
      const perDay: Record<string, number> = {};
      for (const [date,count] of Object.entries(dailyActivity(sess, m.aktivitasHarian ?? null))) {
        const [y,month,day] = date.split("-").map(Number);
        perDay[`${y}-${month-1}-${day}`] = count;
      }
      /* Minggu lalu (7 hari sebelum jendela 7 hari ini) — buat "+N% vs lalu". */
      let mingguLalu = 0;
      for (let i = 13; i >= 7; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        mingguLalu += perDay[`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`] ?? 0;
      }
      const wk: WeekDay[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        const v = perDay[`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`] ?? 0;
        wk.push({ d: DAY_LETTER[d.getDay()], v, h: 0, now: i === 0 });
      }
      const maxV = Math.max(1, ...wk.map(w => w.v));
      wk.forEach(w => (w.h = w.v > 0 ? Math.max(8, Math.round((w.v / maxV) * 100)) : 0));
      const mingguIni = wk.reduce((s, w) => s + w.v, 0);

      const snap: SalinanBeranda = {
        tanggal: hariIniStr,
        name: special ? special.name : m.nama.charAt(0).toUpperCase() + m.nama.slice(1),
        loveNote: special ? special.note : null,
        avatar: m.avatar,
        kotoba: m.kotobaTotal,
        progKotoba: { n: m.kotobaProgres.filter(r => setKata.has(r.word) && r.benar + r.salah > 0).length, total: dek.kata.length },
        progBunpou: {
          n: polaku.length, total: dek.pola.length,
          // sama dengan status "wrong" di /materi/bunpou
          salah: polaku.filter(r => r.salah >= 2 && r.salah > r.benar).length,
        },
        kanjiSalah: kanjiSeringSalah(m.kotobaProgres),
        sessionError: Boolean(m.sessionError),
        sessions: riwayat.slice(0, 4),
        semuaSesi: sess as unknown as SesiSkor[],
        totalSoal: sess.reduce((s, r) => s + (r.total ?? 0), 0), // ukuran library soal (bank + analisis)
        resume: riwayat.find(r => r.score == null) ?? riwayat[0] ?? sess[0] ?? null,
        avgScore: rata(practiced),
        focus: FOCUS_CATS.map(c => {
          const b = catAgg[c.jp];
          return { ...c, pct: b && b.a > 0 ? Math.round((b.c / b.a) * 100) : null, n: b?.a ?? 0 };
        }),
        week: wk,
        hariIni: wk[wk.length - 1]?.v ?? 0,
        activeDays: wk.filter(w => w.v > 0).length,
        delta: {
          soalMinggu,
          akurasiBulan: akBulanIni != null && akBulanLalu != null ? akBulanIni - akBulanLalu : null,
          kotobaMinggu: m.kotobaMingguIni,
          aktivitas: mingguLalu > 0 ? Math.round((mingguIni - mingguLalu) / mingguLalu * 100) : null,
        },
      };
      segarRef.current = true;
      terapkan(snap);
      if (!DEV_BYPASS) {
        const uid = await uidLokal();
        /* Salinan cuma bawa sesi 35 hari terakhir — itu jendela yang dipakai
           Misi & Perkiraan (30 hari); seluruh riwayat bisa ratusan KB. */
        const batasSesi = now.getTime() - 35 * 86_400_000;
        if (uid) simpanCache(CACHE_BERANDA, uid, { ...snap, semuaSesi: sess.filter(r => !(t(r) < batasSesi)) as unknown as SesiSkor[] });
      }
      setLoading(false);
    }
    load();
  // stats.examDate dateng belakangan (profil dibaca async), jadi hitung mundurnya
  // wajib diitung ulang begitu kebaca — kalau dep-nya kosong, yang kepajang
  // selamanya tanggal ancar-ancar.
  }, [stats.examDate, stats.targetLevel]);

  /* Streak naik (sekali per hari): chip N-1 → N membesar, Honix lompat,
     banner 3.2 detik, chime. Flag ditulis di sini (bukan di load) biar
     StrictMode yang jalanin effect dua kali tetap nampilin animasinya. */
  const streakNaik = kandidatNaik && stats.loaded && stats.streak >= 2;
  useEffect(() => {
    if (!streakNaik) return;
    try { localStorage.setItem(LS_STREAK_NAIK, tanggalLokal()); } catch { /* mode privat */ }
    const t1 = setTimeout(() => {
      const daftar = BANNER_STREAK(stats.streak);
      setPesanBanner(daftar[Math.floor(Math.random() * daftar.length)]);
      setFaseNaik("naik");
      putarHonix("chime");
    }, 900);
    const t2 = setTimeout(() => setFaseNaik("keluar"), 900 + 3200);
    const t3 = setTimeout(() => setFaseNaik("selesai"), 900 + 3200 + 220);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [streakNaik, stats.streak]);
  const streakTampil = streakNaik && faseNaik === null ? stats.streak - 1 : stats.streak;

  const resumeHref = resume ? (resume.section === "choukai" ? `/choukai/${resume.id}` : `/latihan/${resume.id}`) : "/materi";
  const dash = "—";
  /* Level & XP dari profil — sebelum kebaca, tulis "—", bukan nilai bawaan
     (N3 / 0 XP) yang sekejap kemudian berubah. */
  const lvTampil = stats.loaded ? stats.targetLevel : dash;
  const weakest = useMemo(() => {
    const present = focus.filter(f => f.pct != null && f.n > 0);
    if (!present.length) return null;
    return present.reduce((lo, f) => (f.pct! < lo.pct! ? f : lo));
  }, [focus]);

  /* Kalimat Honix di hero. Angkanya dari data, bukan target karangan. */
  const sapa = useMemo<ReactNode>(() => {
    if (loveNote) return loveNote;
    if (streakNaik) return "Sesi pertama hari ini beres. Streak aman 🔥";
    const calon: ReactNode[] = [<>Honix udah siap. Kamu?</>];
    if (hariIni > 0) calon.push(<>Hari ini udah <b>{hariIni} aktivitas belajar</b>. Lanjut, yuk!</>);
    if (streak > 0) calon.push(<>Streak <b>{streak} hari</b>. Jangan sampai putus, ya!</>);
    if (weakest) calon.push(<>Hari ini fokus <b>{weakest.jp}</b>, yuk.</>);
    return calon[acak % calon.length];
  }, [loveNote, streakNaik, hariIni, streak, weakest, acak]);

  return (
    <>
      <AuroraBackground />
      <NavRail />
      <BottomNav />
      <main className="app-shell">
        <div className={`beranda-v2${kurangiGerak ? " hx-rm" : ""}`}>
          {/* Pro mau habis (H-7/H-3/H-1) — sendiri, bukan lewat lonceng: ini
              soal akses, bukan kebiasaan belajar. Ditaruh di atas topbar:
              Honix besar di hero menjorok ke atas, jadi topbar harus nempel
              langsung di atas hero. */}
          <PengingatPro />

          {/* peringatan paling mendesak — sisanya di lonceng <UserBar> */}
          <PeringatanBanner />

          {/* topbar — sapaan "おかえり" pindah ke hero Honix */}
          <div className="bv-top">
            <div className="bv-greet">
              <p>{meta.date || "\u00a0"}{meta.days != null && <> · JLPT {lvTampil} · <b>{meta.days} hari lagi</b> menuju ujian</>}</p>
            </div>
            <div className="bv-top-r">
              <button type="button" className="al-help" aria-label="Cara belajar di Honix" data-tur="bantuan" onClick={bukaCaraBelajar}>?</button>
              <span className={`bv-pill streak${faseNaik === "naik" && !kurangiGerak ? " bump" : ""}`}>
                <span className="fl">🔥</span> <b>{loading ? dash : streakTampil}</b> hari
              </span>
              <div className="bv-xp"><div className="bv-xp-top"><span title="Level XP Honix — beda sama level JLPT (N1–N5)">Lv Honix {stats.level}</span><b>{stats.loaded ? stats.xp : dash} / {stats.xpTarget} XP</b></div><div className="bv-xp-bar"><i style={{ width: `${Math.round(stats.xp / stats.xpTarget * 100)}%` }} /></div></div>
              <span className="bv-lv">{lvTampil}</span>
              {/* HP gak punya menu "Lainnya" lagi — avatar jadi jalan ke Pengaturan (dan Keluar di sana). */}
              <Link href="/pengaturan" aria-label="Pengaturan akun" className={`bv-ava${avatar ? "" : " honix"}`}>{avatar ? <img src={avatar} alt={name} className="bv-ava-img" referrerPolicy="no-referrer" /> : <Image src={honixSrc("kepala")} alt="" width={46} height={46} className="avatar-hx" />}</Link>
            </div>
          </div>

          {/* hero Honix */}
          <section className={`bv-hero${!resume && !loading ? " kosong" : ""}${kurangiGerak ? " hx-rm" : ""}`}>
            <div className="bv-hero-m">
              <div className="bv-hero-eye">{jam}</div>
              <h1>
                おかえり, {name} <span className="jp">{loveNote ? "💕" : "頑張ろう!"}</span>
              </h1>
              <div className={`bv-hero-say${loveNote ? " love" : ""}`}>
                <Image src={honixSrc("kepala")} alt="" width={30} height={30} />
                <span>{sapa}</span>
              </div>

              {/* Selama data belum datang: tempat kosong seukuran kartu Lanjutin.
                  Di HP kartu ini ±160px — muncul belakangan = semua isi di
                  bawahnya lompat. Kalau ternyata gak ada yang dilanjutin,
                  tempatnya ilang (sekali, bukan tiap buka). */}
              {loading && !resume && <div className="bv-resume bv-resume-skel" aria-hidden="true" />}
              {resume && (
                <Link href={resumeHref} className="bv-resume">
                  <div className="res-ic">{resume.section === "choukai" ? "🎧" : "✍️"}</div>
                  <div className="res-m">
                    <div className="res-t">Lanjutin: <span className="jpt">{judulSet(resume.title)}</span> — {jenisSesi(resume)}</div>
                    <ResumeSub s={resume} />
                  </div>
                  <span className="btn btn-p">▶ Lanjutin</span>
                </Link>
              )}
            </div>

            {/* Honix sakura — SELALU, persis mock (state default "Sapaan").
                Diam: gak ada animasi masuk/idle, cuma bara yang gerak. */}
            <div className="bv-hero-bird">
              <div className="bv-trail" aria-hidden="true">
                {BARA.map(([x, y, c, d, dl], i) => (
                  <i key={i} style={{ "--x": `${x}px`, "--y": `${y}px`, "--c": c, "--d": `${d}ms`, "--dl": `${dl}ms` } as React.CSSProperties} />
                ))}
              </div>
              <Honix pose="sakura" size={570} idle="none" preload />
            </div>
          </section>

          {/* stats */}
          <div className="bv-stats">
            <div className="bv-stat card"><div className="stat-l"><span className="stat-ic" style={{ background: "rgba(221,65,36,0.14)" }}>📷</span>Soal Dianalisis</div><div className="stat-v">{loading ? dash : totalSoal}<span className="u">soal</span></div><div className={`stat-d ${delta.soalMinggu > 0 ? "up" : "flat"}`}>{delta.soalMinggu > 0 ? `↑ +${delta.soalMinggu} minggu ini` : "+0 minggu ini"}</div></div>
            <div className="bv-stat card"><div className="stat-l"><span className="stat-ic" style={{ background: "rgba(107,142,63,0.16)" }}>🎯</span>Akurasi</div><div className="stat-v">{loading || avgScore == null ? dash : avgScore}<span className="u">%</span></div>{delta.akurasiBulan != null
              ? <div className={`stat-d ${delta.akurasiBulan > 0 ? "up" : "flat"}`}>{delta.akurasiBulan > 0 ? `↑ +${delta.akurasiBulan}` : delta.akurasiBulan < 0 ? `↓ −${-delta.akurasiBulan}` : "±0"}% bulan ini</div>
              : <div className="stat-d flat">jawaban benar / dijawab</div>}</div>
            <div className="bv-stat card"><div className="stat-l"><span className="stat-ic" style={{ background: "rgba(212,160,74,0.15)" }}>🔥</span>Streak</div><div className="stat-v">{loading ? dash : streak}<span className="u">hari</span></div><div className="stat-d flat">Rekor: {stats.loaded ? stats.rekor : dash} hari</div></div>
            <div className="bv-stat card"><div className="stat-l"><span className="stat-ic" style={{ background: "rgba(139,90,140,0.18)" }}>📖</span>Kotoba</div><div className="stat-v">{loading || kotoba == null ? dash : kotoba}<span className="u">kata</span></div><div className={`stat-d ${delta.kotobaMinggu ? "up" : "flat"}`}>{delta.kotobaMinggu ? `↑ +${delta.kotobaMinggu} minggu ini` : "+0 minggu ini"}</div></div>
          </div>

          <div className="bv-grid">
            <div className="bv-col">
              {/* Misi harian (Rencana Belajar §3): paling atas kolom kiri, di bawah baris statistik. */}
              {/* Sebelum profil kebaca: kotak kosong seukuran kartu Misi, biar
                  semua yang di bawahnya gak kedorong pas misinya muncul. */}
              {stats.loaded
                ? <MisiHarian level={stats.targetLevel} rekorStreak={stats.rekor} sesi={semuaSesi} />
                : <div className="rbk rbk-misi"><div className="card misi" aria-busy="true" /></div>}
              {/* Ajakan Discord versi HP/tablet — sidebar turun ke bawah di ≤1000px. */}
              <AjakanDiscord letak="kolom" />
              {/* kanji + quiz */}
              <div className="bv-duo">
                <div className="bv-kanji card">
                  <div className="kj-stage"><span className="kj">{(kanji?.highlight ?? kanji?.word ?? "—").charAt(0) || "—"}</span></div>
                  <div className="kj-meta">
                    {/* Badge level = level asli kanji-nya (data N1-N5). Kartunya
                        "kanji hari ini", jadi badge nunjukin level kanji itu. */}
                    <div className="tagrow">
                      <span className="tag tag-day">● Kanji Hari Ini</span>
                      {kanji?.level && <span className="tag tag-lvl">{kanji.level}</span>}
                    </div>
                    <div className="kj-read">{kanji?.readingDot ?? ""}{kanji?.romaji && <span className="rom">{kanji.romaji}</span>}</div>
                    <div className="kj-mean">{kanji?.meaning ?? "Memuat…"}</div>
                    {kanji?.example && (
                      <div className="kj-ex">
                        {renderKjExample(kanji.example, kanji.highlight)}
                        {kanji.example_id && <span className="tr">{kanji.example_id}</span>}
                      </div>
                    )}
                  </div>
                </div>
                {/* Soal pola Bunpou level target, ganti tiap hari. */}
                <KilatHarian level={stats.targetLevel} />
              </div>

              {/* fokus latihan 5 kategori — dari ai_result.stats (real) */}
              <div className="bv-fokus card">
                <div className="f-head"><h3>Fokus Latihan — akurasi per kategori</h3><Link href="/progres?tab=stat">Statistik lengkap →</Link></div>
                <div className="cats">
                  {(focus.length ? focus : FOCUS_CATS.map(c => ({ ...c, pct: null as number | null, n: 0 }))).map(c => (
                    <div key={c.ro} className={`cat c-${c.ro.toLowerCase()}`}>
                      <div className="cat-jp">{c.jp}</div><div className="cat-ro">{c.ro}</div>
                      <div className="cat-bar"><i style={{ width: `${c.pct ?? 0}%` }} /></div>
                      <div className="cat-pct">{c.pct != null ? `${c.pct}%` : "—"}</div><div className="cat-n">{c.n} soal</div>
                    </div>
                  ))}
                </div>
                {weakest ? (
                  <div className="f-note"><Image className="hx-tip" src={honixSrc("tunjuk")} alt="" width={52} height={52} /><span><b>{weakest.jp} paling lemah ({weakest.pct}%)</b> — dari {weakest.n} soal yang kamu jawab.</span><Link href={(DRILL_KATEGORI[weakest.jp] ?? (() => "/materi"))(stats.targetLevel)} className="btn btn-p sm">Drill {weakest.ro} →</Link></div>
                ) : (
                  <div className="f-note"><Image className="hx-tip" src={honixSrc("tunjuk")} alt="" width={52} height={52} /><span>Belum ada data akurasi — <b>kerjain latihan/ujian</b> dulu biar kategori kamu keliatan.</span><Link href="/materi" className="btn btn-p sm">Mulai →</Link></div>
                )}
              </div>

              {/* shortcut materi — 3 kartu; Kanji Sering Salah hilang kalau
                  belum ada data salah (user baru) → grid jadi 2 kolom. */}
              <div className={`bv-materi2${kanjiSalah ? " tiga" : ""}`}>
                <Link href="/materi/kotoba" className="m-card card"><span className="m-glyph">語</span><div className="m-ic goi">📖</div><div className="m-m"><div className="m-t">Kotoba {lvTampil}</div><div className="m-s">{progKotoba ? `${progKotoba.n.toLocaleString("id-ID")} / ${progKotoba.total.toLocaleString("id-ID")} kata ditemuin` : "Kosakata per level"}</div></div>{progKotoba && progKotoba.total > 0 && <div className="m-bar"><i style={{ width: `${Math.round(progKotoba.n / progKotoba.total * 100)}%` }} /></div>}</Link>
                <Link href="/materi/bunpou" className="m-card card"><span className="m-glyph">文</span><div className="m-ic bun">📐</div><div className="m-m"><div className="m-t">Bunpou {lvTampil}</div><div className="m-s">{progBunpou ? `${progBunpou.n} / ${progBunpou.total} pola${progBunpou.salah ? ` · ${progBunpou.salah} sering salah` : ""}` : "Pola grammar per level"}</div></div>{progBunpou && progBunpou.total > 0 && <div className="m-bar"><i style={{ width: `${Math.round(progBunpou.n / progBunpou.total * 100)}%` }} /></div>}</Link>
                {kanjiSalah && (
                  <Link href={`/latihan/kotoba?level=${stats.targetLevel}`} className="m-card m-warn card"><span className="m-glyph">{kanjiSalah.kanji[0]}</span><div className="m-ic kanji">⚡</div><div className="m-m"><div className="m-t">Kanji Sering Salah</div><div className="m-s"><b>{kanjiSalah.kanji.join(" · ")}</b> salah {kanjiSalah.salah}× · drill 2 menit</div></div></Link>
                )}
              </div>
            </div>

            {/* sidebar */}
            <aside className="bv-side">
              <div className="bv-scard card">
                <div className="s-h">Target Ujian</div>
                <div className="cd">
                  <div className="cd-ring">
                    <svg width="74" height="74" viewBox="0 0 74 74"><circle cx="37" cy="37" r="32" fill="none" stroke="var(--surface-3)" strokeWidth="6" /><circle cx="37" cy="37" r="32" fill="none" stroke="var(--primary)" strokeWidth="6" strokeLinecap="round" strokeDasharray="201" strokeDashoffset={meta.days != null ? Math.max(0, 201 - 201 * Math.min(1, (365 - Math.min(365, meta.days)) / 365)) : 80} transform="rotate(-90 37 37)" /></svg>
                    <span className="n">{meta.days ?? dash}</span>
                  </div>
                  <div className="cd-m"><div className="cd-t">JLPT {lvTampil} · {examLabel}</div><div className="cd-s">{meta.days != null ? `${meta.days} hari lagi — jaga pace kamu, konsisten menang.` : ""}</div></div>
                </div>
              </div>

              <AjakanDiscord letak="samping" />

              <div className="bv-scard card">
                <div className="s-h">Aktivitas 7 hari {delta.aktivitas != null
                  ? <span className={`r${delta.aktivitas < 0 ? " turun" : ""}`}>{delta.aktivitas >= 0 ? "+" : "−"}{Math.abs(delta.aktivitas)}% vs lalu</span>
                  : <span className="r">aktivitas belajar</span>}</div>
                <div className="wk">
                  {(week.length ? week : Array.from({ length: 7 }, (_, i) => ({ d: DAY_LETTER[i], h: 0, v: 0, now: i === 6 }))).map((c, i) => (
                    <div className="wkc" key={i}><div className={`wkb${c.v === 0 ? " mut" : ""}${c.now ? " now" : ""}`} style={{ height: `calc(${Math.max(c.h, 5)}% * 0.7)` }} title={`${c.v} aktivitas`} /><span className={`wkl${c.now ? " now" : ""}`}>{c.d}</span></div>
                  ))}
                </div>
                <div className="wk-note">{activeDays > 0 ? <><b>{activeDays} dari 7 hari</b> aktif — streak {streak} hari 🔥 jaga hari ini!</> : <>Belum ada aktivitas minggu ini — <b>mulai hari ini</b> 💪</>}</div>
              </div>

              {fiturLive("perkiraan") && !loading && <PerkiraanMini sesi={semuaSesi} level={stats.targetLevel} hariIni={tanggalLokal()} />}

              <KalenderMini />

              <div className="bv-scard card">
                <div className="s-h">Riwayat Terakhir <Link href="/progres?tab=log" className="s-all">Semua →</Link></div>
                <div className="riw">
                  {loading ? <div className="riw-empty">memuat…</div>
                    : sessionError ? <div className="riw-empty" role="alert">Riwayat belum bisa dimuat. Coba muat ulang.</div>
                    : sessions.length === 0 ? <div className="riw-empty">Belum ada sesi latihan</div>
                    : sessions.map(s => {
                      const st = riwStyle(s); const pct = scorePct(s);
                      return (
                        <Link key={s.id} href={s.section === "choukai" ? `/choukai/${s.id}` : `/analisis-foto?session=${s.id}`} className="riw-i">
                          <span className="riw-g" style={{ background: st.bg, borderColor: st.bd, color: st.fg }}>{st.g}</span>
                          <div className="riw-m"><div className="riw-t">{judulSet(s.title)}</div><div className="riw-s">{hasPracticeDate(s) ? relativeTime(activityAt(s)) : "Waktu latihan belum tercatat"} · {answeredCount(s)}/{s.total} soal dibahas{s.score == null ? " · sedang dikerjakan" : ""}</div></div>
                          {pct != null && <span className={`riw-sc ${pct >= 80 ? "sc-g" : "sc-m"}`}>{pct}%</span>}
                        </Link>
                      );
                    })}
                </div>
              </div>

            </aside>
          </div>
        </div>

        {/* Banner streak naik — 3.2 detik, sekali per hari */}
        {(faseNaik === "naik" || faseNaik === "keluar") && (
          <div className={`bv-streak-banner${faseNaik === "keluar" ? " out" : ""}${kurangiGerak ? " rm" : ""}`} role="status">
            <Image src={honixSrc("terbang")} alt="" width={34} height={34} />
            <span>{pesanBanner}</span>
          </div>
        )}
      </main>
    </>
  );
}

