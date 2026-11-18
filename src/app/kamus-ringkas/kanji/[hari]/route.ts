import { KANJI_POOL } from "@/lib/kamus-server";

/* Kanji Hari Ini, satu kartu per hari-dalam-tahun (1–366). Dibikin statis pas
   build: isinya gak tergantung siapa yang minta, jadi CDN yang jawab — gak
   lewat login (dikecualiin di matcher proxy) dan gak nyentuh database. */
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return Array.from({ length: 367 }, (_, i) => ({ hari: String(i) }));
}

export async function GET(_req: Request, ctx: { params: Promise<{ hari: string }> }) {
  const hari = Number((await ctx.params).hari);
  const kanji = KANJI_POOL.length ? KANJI_POOL[hari % KANJI_POOL.length] : null;
  return Response.json(kanji);
}
