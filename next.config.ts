import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Font TTF kartu pamer dibaca pakai fs di /api/kartu-pamer — pastiin ikut ke fungsi server. */
  outputFileTracingIncludes: {
    "/api/kartu-pamer": ["./assets/fonts/**/*"],
  },
  /* Nav 5 menu (HANDOFF-alur-belajar §6): halaman lama pindah jadi tab. Query ikut kebawa. */
  async redirects() {
    return [
      { source: "/bank-soal", destination: "/latihan/set", permanent: true },
      { source: "/lembar-tugas", destination: "/latihan/tugas", permanent: true },
      { source: "/catatan", destination: "/kamus/catatan", permanent: true },
      /* Syarat & Ketentuan baru (handoff landing §10) gantiin /syarat. */
      { source: "/syarat", destination: "/terms-and-conditions", permanent: true },
    ];
  },
  /* Landing & halaman legal = HTML statis dari handoff (public/landing/). Landing
     sendiri dipasang di "/" lewat proxy.ts (cuma buat yang belum login). */
  async rewrites() {
    return [
      { source: "/terms-and-conditions", destination: "/landing/terms-and-conditions.html" },
      { source: "/refund-policy", destination: "/landing/refund-policy.html" },
      { source: "/kontak", destination: "/landing/kontak.html" },
    ];
  },
};

export default nextConfig;
