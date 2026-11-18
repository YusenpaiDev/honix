import { LEVEL_KAMUS, ringkasLevel, type LevelKamus } from "@/lib/kamus-server";

/* Daftar kata & pola satu level (cuma tulisannya, tanpa arti/contoh) — buat
   ngitung progres dek di Beranda. Statis pas build, dijawab CDN. */
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return LEVEL_KAMUS.map(level => ({ level }));
}

export async function GET(_req: Request, ctx: { params: Promise<{ level: string }> }) {
  const level = (await ctx.params).level as LevelKamus;
  return Response.json(ringkasLevel(level));
}
