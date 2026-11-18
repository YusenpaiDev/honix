"use client";

import { createClient } from "@/lib/supabase/client";

/** uid akun yang lagi login, dari sesi lokal (baca cookie, tanpa nanya
 *  server) — cuma buat milih salinan di cache-lokal.ts, BUKAN buat izin. */
export async function uidLokal(): Promise<string | null> {
  try {
    const { data } = await createClient().auth.getSession();
    return data.session?.user.id ?? null;
  } catch { return null; }
}
