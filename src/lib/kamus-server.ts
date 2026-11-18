/**
 * Kamus kotoba & bunpou buat SERVER aja (route /kamus-ringkas/*).
 *
 * Jangan diimport dari komponen "use client": file ini nyeret ±2,7 MB JSON.
 * Browser cukup minta potongan kecilnya lewat route — satu kanji per hari,
 * dan daftar kata/pola satu level.
 */
import kotobaN1 from "@/data/kotoba/N1.json";
import kotobaN2 from "@/data/kotoba/N2.json";
import kotobaN3 from "@/data/kotoba/N3.json";
import kotobaN4 from "@/data/kotoba/N4.json";
import kotobaN5 from "@/data/kotoba/N5.json";
import bunpouN1 from "@/data/bunpou/N1.json";
import bunpouN2 from "@/data/bunpou/N2.json";
import bunpouN3 from "@/data/bunpou/N3.json";
import bunpouN4 from "@/data/bunpou/N4.json";
import bunpouN5 from "@/data/bunpou/N5.json";
import { susunKanjiPool, type KanjiVocab } from "@/lib/kanji-harian";

export const LEVEL_KAMUS = ["N1", "N2", "N3", "N4", "N5"] as const;
export type LevelKamus = typeof LEVEL_KAMUS[number];

const kata = (d: unknown) => ((d as { vocabulary?: KanjiVocab[] }).vocabulary ?? []);
const KOTOBA: Record<LevelKamus, KanjiVocab[]> = {
  N1: kata(kotobaN1), N2: kata(kotobaN2), N3: kata(kotobaN3), N4: kata(kotobaN4), N5: kata(kotobaN5),
};
const pola = (d: unknown) => ((d as { patterns?: { pattern: string }[] }).patterns ?? []).map(p => p.pattern);
const BUNPOU: Record<LevelKamus, string[]> = {
  N1: pola(bunpouN1), N2: pola(bunpouN2), N3: pola(bunpouN3), N4: pola(bunpouN4), N5: pola(bunpouN5),
};

/* Urutan N5→N1 sama persis kayak versi lama di Beranda, biar kanji tiap
   tanggal gak berubah gara-gara pindahan ini. */
export const KANJI_POOL = susunKanjiPool([...KOTOBA.N5, ...KOTOBA.N4, ...KOTOBA.N3, ...KOTOBA.N2, ...KOTOBA.N1]);

/** Daftar kata & pola satu level — buat "x / total" di kartu Kotoba & Bunpou. */
export function ringkasLevel(lv: LevelKamus) {
  return { kata: KOTOBA[lv].map(w => w.word ?? ""), pola: BUNPOU[lv] };
}
