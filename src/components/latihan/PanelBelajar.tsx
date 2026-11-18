"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { BookmarkPlus, Loader2, MessageCircle, NotebookPen, Plus, Search, Send, Sparkles, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Honix } from "@/components/honix/Honix";
import "@/styles/panel-belajar.css";

/**
 * Panel Sensei / Kamus / Catatan buat latihan di luar Bank Soal (Latihan
 * Kilat Kotoba & Bunpou).
 *
 * Markup & kelas CSS-nya SAMA kayak panel kanan Bank Soal (side-tabs,
 * sensei-card, side-card, …) biar kelihatan satu keluarga. Bedanya cuma
 * wadahnya: di Bank Soal panel itu kolom tetap; di sini laci — dari kanan di
 * desktop, lembar bawah di HP — karena Latihan Kilat sengaja satu kolom fokus.
 *
 * Panel ini cuma dibuka SETELAH soal dijawab (pemanggil yang jaga). Kalau bisa
 * dibuka sebelum jawab, Sensei/Kamus jadi jalan pintas nyontek.
 */

export type TabPanel = "chat" | "kamus" | "catatan";

/** Soal yang lagi dibahas — bentuknya sama kayak `context.questions[0]` di /api/chat. */
export interface KonteksSoal {
  question: string;
  options: string[];
  correct: string;
  explanation: string;
  passage?: string;
}

/** Perintah dari luar (tombol di kartu pembahasan / blok teks). `n` beda = perintah baru. */
export interface PerintahPanel { jenis: "tanya" | "kamus" | "catat"; teks: string; n: number }

interface ChatMsg { role: "user" | "model"; text: string }
type Kata = { id: string; kanji: string; reading: string | null; meaning: string };
type Catatan = { id: string; judul: string; isi: string; updated_at: string };

const SARAN = ["Kenapa jawaban ini benar?", "Kasih contoh kalimat lain", "Bedanya sama pilihan lain apa?"];

export function PanelBelajar({ buka, onTutup, tab, onTab, judul, soal, sumber, perintah }: {
  buka: boolean;
  onTutup: () => void;
  tab: TabPanel;
  onTab: (t: TabPanel) => void;
  /** Judul latihan, mis. "Latihan Kilat Kotoba N2" — dikirim ke Sensei & jadi sumber catatan. */
  judul: string;
  soal: KonteksSoal | null;
  /** Ditulis di kolom `source` catatan. */
  sumber: string;
  perintah: PerintahPanel | null;
}) {
  /* Portal ke <body> cuma di browser (server gak punya document). */
  const siap = useSyncExternalStore(() => () => {}, () => true, () => false);

  /* ── Sensei ── */
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [isiChat, setIsiChat] = useState("");
  const [kirimChat, setKirimChat] = useState(false);
  const inputChat = useRef<HTMLInputElement>(null);

  const kirim = async () => {
    const msg = isiChat.trim();
    if (!msg || kirimChat) return;
    setIsiChat("");
    const baru: ChatMsg[] = [...chat, { role: "user", text: msg }];
    setChat(baru);
    setKirimChat(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: msg,
          context: { title: judul, questions: soal ? [soal] : [] },
          history: chat.slice(-8).map(m => ({ role: m.role, text: m.text.slice(0, 2000) })),
        }),
      });
      const json = await res.json().catch(() => ({}));
      const teks = res.ok ? json.reply : (json.message ?? json.error);
      setChat([...baru, { role: "model", text: teks || "Maaf, gagal membalas." }]);
    } catch {
      setChat([...baru, { role: "model", text: "Maaf, terjadi kesalahan. Coba lagi." }]);
    } finally { setKirimChat(false); }
  };

  /* ── Kamus ── */
  const [kata, setKata] = useState<Kata[]>([]);
  const [kataSiap, setKataSiap] = useState(false);
  const [cari, setCari] = useState("");
  const [tambah, setTambah] = useState({ kanji: "", reading: "", meaning: "" });
  const [isiOtomatis, setIsiOtomatis] = useState(false);
  const [simpanKata, setSimpanKata] = useState(false);
  const [kilatId, setKilatId] = useState<string | null>(null);

  useEffect(() => {
    if (!buka || tab !== "kamus" || kataSiap) return;
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      /* Gagal / gak login → tetap "siap" (daftar kosong), biar gak muter selamanya. */
      if (!user) { setKataSiap(true); return; }
      const semua: Kata[] = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await supabase.from("saved_words").select("id, kanji, reading, meaning")
          .eq("user_id", user.id).order("created_at", { ascending: false }).order("id", { ascending: false })
          .range(from, from + 999);
        if (error) break;
        semua.push(...((data ?? []) as Kata[]));
        if ((data?.length ?? 0) < 1000) break;
      }
      setKata(semua);
      setKataSiap(true);
    })().catch(() => setKataSiap(true));
  }, [buka, tab, kataSiap]);

  const otomatis = async (w?: string) => {
    const word = (w ?? tambah.kanji).trim();
    if (!word || isiOtomatis) return;
    setIsiOtomatis(true);
    setTambah({ kanji: word, reading: "", meaning: "" });
    try {
      const res = await fetch("/api/furigana", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word, withMeaning: true }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) setTambah({ kanji: word, reading: json.reading ?? "", meaning: json.meaning ?? "" });
    } catch { /* isi manual aja */ }
    finally { setIsiOtomatis(false); }
  };

  const simpanKeKamus = async () => {
    const kanji = tambah.kanji.trim();
    if (!kanji || !tambah.meaning.trim() || simpanKata) return;
    setSimpanKata(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { kabari("Login dulu", false); return; }
      /* Upsert + created_at baru: kata yang udah ada naik ke atas, bukan dilewati
         (sama kayak Bank Soal). */
      const { data, error } = await supabase.from("saved_words").upsert({
        user_id: user.id, kanji, reading: tambah.reading.trim() || null,
        meaning: tambah.meaning.trim(), created_at: new Date().toISOString(),
      }, { onConflict: "user_id,kanji" }).select("id, kanji, reading, meaning").single();
      if (error) throw error;
      setKata(k => [data as Kata, ...k.filter(x => x.id !== data.id)]);
      setKilatId(data.id); setTimeout(() => setKilatId(null), 1600);
      setTambah({ kanji: "", reading: "", meaning: "" });
      kabari(`${kanji} disimpan ke Kamus ✓`, true);
    } catch (e) {
      kabari(`Gagal: ${(e as { message?: string })?.message ?? "coba lagi"}`, false);
    } finally { setSimpanKata(false); }
  };

  /* ── Catatan ── */
  const [catatan, setCatatan] = useState<Catatan[]>([]);
  const [catatanSiap, setCatatanSiap] = useState(false);
  const [tulis, setTulis] = useState<string | null>(null);
  const [simpanCatat, setSimpanCatat] = useState(false);
  const [dibuka, setDibuka] = useState<string | null>(null);

  useEffect(() => {
    if (!buka || tab !== "catatan" || catatanSiap) return;
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setCatatanSiap(true); return; }
      const { data } = await supabase.from("catatan").select("id, judul, isi, updated_at")
        .eq("user_id", user.id).order("updated_at", { ascending: false });
      setCatatan((data ?? []) as Catatan[]);
      setCatatanSiap(true);
    })().catch(() => setCatatanSiap(true));
  }, [buka, tab, catatanSiap]);

  const simpanCatatan = async () => {
    const isi = (tulis ?? "").trim();
    if (!isi || simpanCatat) return;
    setSimpanCatat(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { kabari("Login dulu", false); return; }
      const { data, error } = await supabase.from("catatan").insert({
        user_id: user.id, judul: isi.split("\n")[0].slice(0, 60) || "Catatan", isi, source: sumber,
      }).select("id, judul, isi, updated_at").single();
      if (error) throw error;
      setCatatan(c => [data as Catatan, ...c]);
      setTulis(null);
      kabari("Catatan disimpan ✓", true);
    } catch (e) {
      kabari(`Gagal: ${(e as { message?: string })?.message ?? "coba lagi"}`, false);
    } finally { setSimpanCatat(false); }
  };

  /* ── Pemberitahuan kecil ── */
  const [toast, setToast] = useState<{ text: string; ok: boolean } | null>(null);
  const kabari = (text: string, ok: boolean) => { setToast({ text, ok }); setTimeout(() => setToast(null), 2200); };

  /* ── Perintah dari kartu pembahasan / blok teks ── */
  const nTerakhir = useRef(0);
  useEffect(() => {
    if (!perintah || perintah.n === nTerakhir.current) return;
    nTerakhir.current = perintah.n;
    if (perintah.jenis === "tanya") {
      onTab("chat");
      setIsiChat(perintah.teks);
      requestAnimationFrame(() => inputChat.current?.focus());
    } else if (perintah.jenis === "kamus") {
      onTab("kamus");
      void otomatis(perintah.teks);
    } else {
      onTab("catatan");
      setTulis(perintah.teks);
    }
  // otomatis/onTab dipanggil sekali per perintah baru — `n` yang jadi pemicunya
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perintah]);

  /* Esc nutup panel (halaman latihan sengaja gak bereaksi selama panel kebuka). */
  useEffect(() => {
    if (!buka) return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onTutup(); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [buka, onTutup]);

  /* Tarik pegangan ke bawah buat nutup (HP) — sama kayak lembar Bank Soal. */
  const laci = useRef<HTMLElement>(null);
  const tarik = useRef<number | null>(null);
  const tarikMulai = (e: React.TouchEvent) => { tarik.current = e.touches[0].clientY; };
  const tarikGeser = (e: React.TouchEvent) => {
    if (tarik.current == null || !laci.current) return;
    const dy = Math.max(0, e.touches[0].clientY - tarik.current);
    laci.current.style.transition = "none";
    laci.current.style.transform = `translateY(${dy}px)`;
  };
  const tarikLepas = (e: React.TouchEvent) => {
    if (tarik.current == null || !laci.current) return;
    const dy = e.changedTouches[0].clientY - tarik.current;
    tarik.current = null;
    laci.current.style.transition = "";
    laci.current.style.transform = "";
    if (dy > 70) onTutup();
  };

  if (!siap) return null;

  const q = cari.toLowerCase();
  const kataTampil = kata.filter(w => !q || w.kanji.includes(cari) || (w.reading ?? "").includes(cari) || w.meaning.toLowerCase().includes(q));

  return createPortal(
    <>
      {buka && <div className="pb-ov" onClick={onTutup} aria-hidden="true" />}
      <aside ref={laci} className={`pb-laci${buka ? " buka" : ""}`} aria-label="Sensei, Kamus, Catatan" aria-hidden={!buka}>
        <div className="pb-head" onTouchStart={tarikMulai} onTouchMove={tarikGeser} onTouchEnd={tarikLepas}>
          <span className="pb-grip" aria-hidden="true" />
          <button type="button" className="pb-tutup" onClick={onTutup} aria-label="Tutup panel"><X size={18} strokeWidth={2} /></button>
        </div>

        <div className="glass-card side-tabs">
          <button type="button" className={`side-tab${tab === "chat" ? " on" : ""}`} onClick={() => onTab("chat")}>
            <MessageCircle size={13} strokeWidth={1.8} fill={tab === "chat" ? "currentColor" : "none"} /> SENSEI
          </button>
          <button type="button" className={`side-tab${tab === "kamus" ? " on" : ""}`} onClick={() => onTab("kamus")}>
            <BookmarkPlus size={13} strokeWidth={1.8} /> KAMUS
          </button>
          <button type="button" className={`side-tab${tab === "catatan" ? " on" : ""}`} onClick={() => onTab("catatan")}>
            <NotebookPen size={13} strokeWidth={1.8} /> CATATAN
          </button>
        </div>

        {tab === "chat" && (
          <div className="glass-card side-card sensei-card">
            <div className="sensei-intro">
              <Honix pose="tunjuk" size={64} sizeHp={52} idle="none" alt="" />
              <div>
                <div className="sensei-name">Sensei AI</div>
                <div className="sensei-status">Online · siap bantu soal ini</div>
              </div>
            </div>
            {chat.length === 0 ? (
              <div className="sensei-suggest">
                {SARAN.map(s => <button key={s} type="button" className="suggest-pill" onClick={() => setIsiChat(s)}>{s}</button>)}
              </div>
            ) : (
              <div className="sensei-msgs">
                {chat.map((m, i) => <div key={i} className={`sensei-msg ${m.role === "user" ? "user" : "bot"}`}>{m.text}</div>)}
                {kirimChat && <div className="sensei-msg bot"><Loader2 size={12} className="animate-spin" /></div>}
              </div>
            )}
            <div className="sensei-input">
              <input ref={inputChat} value={isiChat} onChange={e => setIsiChat(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && kirim()} placeholder="Tanya tentang soal ini..." />
              <button type="button" className="sensei-send" onClick={kirim} disabled={!isiChat.trim() || kirimChat} aria-label="Kirim">
                <Send size={13} strokeWidth={2} />
              </button>
            </div>
          </div>
        )}

        {tab === "kamus" && (
          <div className="glass-card side-card pb-kartu">
            <div className="pb-cari">
              <Search size={13} strokeWidth={1.6} />
              <input value={cari} onChange={e => setCari(e.target.value)} placeholder="Cari kata..." />
              {cari && <button type="button" onClick={() => setCari("")} aria-label="Hapus"><X size={12} /></button>}
            </div>
            <div className="pb-tambah">
              <div className="pb-baris">
                <input className="font-jp-sans pb-in" value={tambah.kanji} placeholder="Ketik kata/kanji..."
                  onChange={e => setTambah(t => ({ ...t, kanji: e.target.value }))}
                  onKeyDown={e => e.key === "Enter" && otomatis()} />
                <button type="button" className="btn btn-magic btn-sm" onClick={() => otomatis()} disabled={!tambah.kanji.trim() || isiOtomatis}>
                  {isiOtomatis ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}{isiOtomatis ? "" : "Auto"}
                </button>
              </div>
              {(tambah.reading || tambah.meaning) && (
                <>
                  <input className="pb-in pb-baca" value={tambah.reading} placeholder="Cara baca (hiragana)"
                    onChange={e => setTambah(t => ({ ...t, reading: e.target.value }))} />
                  <input className="pb-in" value={tambah.meaning} placeholder="Arti"
                    onChange={e => setTambah(t => ({ ...t, meaning: e.target.value }))} />
                  <button type="button" className="btn btn-primary btn-sm pb-penuh" onClick={simpanKeKamus} disabled={!tambah.meaning.trim() || simpanKata}>
                    {simpanKata ? <Loader2 size={12} className="animate-spin" /> : <BookmarkPlus size={12} />} Simpan ke Kamus
                  </button>
                </>
              )}
            </div>
            <div className="pb-daftar">
              {!kataSiap ? <div className="pb-muat"><Loader2 size={16} className="animate-spin" /></div>
                : kataTampil.length === 0 ? <p className="pb-kosong">{kata.length ? "Gak ketemu." : "Kamus kosong. Blok kata di soal, terus Simpan ke Kamus."}</p>
                : kataTampil.map(w => (
                  <div key={w.id} className={`kamus-row pb-kata${kilatId === w.id ? " kamus-row-flash" : ""}`}>
                    <div className="pb-kata-a"><span className="font-jp-sans pb-kanji">{w.kanji}</span>{w.reading && <span className="font-jp-sans pb-reading">{w.reading}</span>}</div>
                    <p>{w.meaning.split(";")[0]}</p>
                  </div>
                ))}
            </div>
          </div>
        )}

        {tab === "catatan" && (
          <div className="glass-card side-card pb-kartu">
            <div className="pb-cat-h">
              <span>{catatan.length} catatan</span>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setTulis(t => (t === null ? "" : null))}>
                <Plus size={11} strokeWidth={2.4} /> Baru
              </button>
            </div>
            {tulis !== null && (
              <div className="pb-tulis">
                <textarea autoFocus value={tulis} onChange={e => setTulis(e.target.value)} placeholder="Tulis catatanmu..." rows={4} />
                <div className="pb-baris">
                  <button type="button" className="btn btn-ghost btn-sm pb-penuh" onClick={() => setTulis(null)}>Batal</button>
                  <button type="button" className="btn btn-primary btn-sm pb-penuh" onClick={simpanCatatan} disabled={!tulis.trim() || simpanCatat}>
                    {simpanCatat ? <Loader2 size={12} className="animate-spin" /> : "Simpan"}
                  </button>
                </div>
              </div>
            )}
            <div className="pb-daftar">
              {!catatanSiap ? <div className="pb-muat"><Loader2 size={16} className="animate-spin" /></div>
                : catatan.length === 0 ? <p className="pb-kosong">Belum ada catatan. Klik &ldquo;Catat&rdquo; di pembahasan.</p>
                : catatan.map(c => (
                  <button key={c.id} type="button" className={`pb-cat${dibuka === c.id ? " buka" : ""}`} onClick={() => setDibuka(d => (d === c.id ? null : c.id))}>
                    <b>{c.judul}</b>
                    {dibuka === c.id && <span className="pb-cat-isi">{c.isi}</span>}
                  </button>
                ))}
            </div>
          </div>
        )}
      </aside>
      {toast && <div className={`af-toast ${toast.ok ? "ok" : "bad"} pb-toast`}>{toast.text}</div>}
    </>,
    document.body,
  );
}
