/**
 * "Kanji Hari Ini" — aturan pilih & bentuk kartunya. Murni (tanpa data), biar
 * bisa dipakai server (src/lib/kamus-server.ts) tanpa nyeret kamus 2,3 MB ke
 * bundle browser. Dulu semua ini + 5 file kotoba ada di app/page.tsx, dan
 * itu ~80% dari JS Beranda.
 */

/* Sumber "Kanji Hari Ini". Dulu kartunya dipaku satu kanji (諦) — sama buat
   semua orang, tiap hari, selamanya. Sekarang dari dataset kotoba beneran,
   disaring yang ada kanjinya (281 dari 505). Contoh kalimat gak ada di dataset,
   jadi barisnya cuma dirender kalau memang ada. */
export interface KanjiVocab { word?: string; reading?: string; meaning?: string; example?: string; example_id?: string; jlpt_level?: string }
export interface KanjiHarian { word: string; reading: string; readingDot: string; romaji: string; meaning: string; level: string; example?: string; example_id?: string; highlight?: string }

const KANA_ROMA: Record<string, string> = { \u3042:"a",\u3044:"i",\u3046:"u",\u3048:"e",\u304a:"o",\u304b:"ka",\u304d:"ki",\u304f:"ku",\u3051:"ke",\u3053:"ko",\u304c:"ga",\u304e:"gi",\u3050:"gu",\u3052:"ge",\u3054:"go",\u3055:"sa",\u3057:"shi",\u3059:"su",\u305b:"se",\u305d:"so",\u3056:"za",\u3058:"ji",\u305a:"zu",\u305c:"ze",\u305e:"zo",\u305f:"ta",\u3061:"chi",\u3064:"tsu",\u3066:"te",\u3068:"to",\u3060:"da",\u3062:"ji",\u3065:"zu",\u3067:"de",\u3069:"do",\u306a:"na",\u306b:"ni",\u306c:"nu",\u306d:"ne",\u306e:"no",\u306f:"ha",\u3072:"hi",\u3075:"fu",\u3078:"he",\u307b:"ho",\u3070:"ba",\u3073:"bi",\u3076:"bu",\u3079:"be",\u307c:"bo",\u3071:"pa",\u3074:"pi",\u3077:"pu",\u307a:"pe",\u307d:"po",\u307e:"ma",\u307f:"mi",\u3080:"mu",\u3081:"me",\u3082:"mo",\u3084:"ya",\u3086:"yu",\u3088:"yo",\u3089:"ra",\u308a:"ri",\u308b:"ru",\u308c:"re",\u308d:"ro",\u308f:"wa",\u3092:"o",\u3093:"n",\u30fc:"" };
const KANA_YOON: Record<string, string> = { \u304d\u3083:"kya",\u304d\u3085:"kyu",\u304d\u3087:"kyo",\u3057\u3083:"sha",\u3057\u3085:"shu",\u3057\u3087:"sho",\u3061\u3083:"cha",\u3061\u3085:"chu",\u3061\u3087:"cho",\u306b\u3083:"nya",\u306b\u3085:"nyu",\u306b\u3087:"nyo",\u3072\u3083:"hya",\u3072\u3085:"hyu",\u3072\u3087:"hyo",\u307f\u3083:"mya",\u307f\u3085:"myu",\u307f\u3087:"myo",\u308a\u3083:"rya",\u308a\u3085:"ryu",\u308a\u3087:"ryo",\u304e\u3083:"gya",\u304e\u3085:"gyu",\u304e\u3087:"gyo",\u3058\u3083:"ja",\u3058\u3085:"ju",\u3058\u3087:"jo",\u3073\u3083:"bya",\u3073\u3085:"byu",\u3073\u3087:"byo",\u3074\u3083:"pya",\u3074\u3085:"pyu",\u3074\u3087:"pyo" };
export function toRomaji(kana: string): string {
  let out = "", i = 0;
  while (i < kana.length) {
    const two = kana.slice(i, i + 2);
    if (KANA_YOON[two]) { out += KANA_YOON[two]; i += 2; continue; }
    const ch = kana[i];
    if (ch === "\u3063") { const r = KANA_YOON[kana.slice(i + 1, i + 3)] || KANA_ROMA[kana[i + 1]] || ""; if (r) out += r[0]; i++; continue; }
    out += KANA_ROMA[ch] ?? ch;
    i++;
  }
  return out;
}
/* \u6311\u3080 + \u3044\u3069\u3080 \u2192 \u3044\u3069\u30fb\u3080 (pisah di batas okurigana). */
export function okuriDot(word: string, reading: string): string {
  const tail = word.match(/[\u3041-\u3093]+$/);
  if (!tail || tail[0].length >= reading.length) return reading;
  const cut = reading.length - tail[0].length;
  return reading.slice(0, cut) + "\u30fb" + reading.slice(cut);
}
export const kanjiCore = (word: string) => word.match(/^[\u4e00-\u9fbf\u3005]+/)?.[0] ?? word;

/** Kumpulan kanji dari dek kotoba (urut N5→N1): yang ada kanjinya & contohnya. */
export function susunKanjiPool(dek: KanjiVocab[]): KanjiHarian[] {
  return dek
    .filter(w => w.word && /[\u4e00-\u9fbf]/.test(w.word) && w.example)
    .map(w => {
      const reading = w.reading ?? "";
      return {
        word: w.word!, reading, readingDot: okuriDot(w.word!, reading), romaji: toRomaji(reading),
        meaning: w.meaning ?? "", level: w.jlpt_level ?? "N2",
        example: w.example, example_id: w.example_id, highlight: kanjiCore(w.word!),
      };
    });
}

/** Hari ke-berapa dalam setahun (1–366) — kartunya ganti tiap hari, bukan acak
 *  tiap render (biar sehari penuh konsisten). Dihitung di browser (tanggal lokal). */
export function hariKe(d: Date) {
  return Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 86_400_000);
}
