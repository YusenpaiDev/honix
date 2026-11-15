import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { GeistSans } from "geist/font/sans";
import { HonixLevelUp } from "@/components/honix/HonixLevelUp";
import { PencatatError } from "@/components/PencatatError";
import { PencatatWaktu } from "@/components/PencatatWaktu";
import { DaftarSW } from "@/components/pwa/DaftarSW";
import "./fonts/noto-jp.css";
import "./globals.css";

// v1 fonts (existing pages still depend on these — keep until last v1 page migrates)
/* Font latin di-host sendiri (file dari Google Fonts, subset latin, variabel).
   Build Vercel berkali-kali gagal acak pas next/font/google ngunduh font
   ("next/font/google queries have exactly one entry") — 8 Okt 2026 kena Space
   Grotesk, lalu JetBrains Mono, lalu Noto Serif JP (9 Okt). File lokal = build
   gak bergantung jaringan. Noto JP di fonts/noto-jp.css (potongan unicode-range
   di public/fonts/noto-jp) — variabel CSS-nya didefinisiin di situ. */
const jakarta = localFont({
  src: "./fonts/PlusJakartaSans-latin.woff2",
  variable: "--font-jakarta",
  weight: "400 800",
  display: "swap",
});
const manrope = localFont({
  src: "./fonts/Manrope-latin.woff2",
  variable: "--font-manrope",
  weight: "400 700",
  display: "swap",
});
const spaceGrotesk = localFont({
  src: "./fonts/SpaceGrotesk-latin.woff2",
  variable: "--font-space",
  weight: "400 700",
  display: "swap",
});

// v2 fonts (warm earthy redesign)
const jetbrainsMono = localFont({
  src: "./fonts/JetBrainsMono-latin.woff2",
  variable: "--font-mono",
  weight: "400 500",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.honixjlpt.com"),
  title: "Honix JLPT",
  description: "Belajar JLPT N5–N1 sampai hari ujian. Misi 20 menit sehari, 8.342 kata, 650 pola, set latihan format JLPT.",
  /* PWA (handoff landing §4, §9): ikon kepala Honix gantiin kotak 先. */
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" }, { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon-180.png", sizes: "180x180" }],
  },
  appleWebApp: { capable: true, title: "Honix", statusBarStyle: "black-translucent" },
  openGraph: {
    title: "Honix JLPT — Belajar JLPT sampai hari ujian",
    description: "Misi 20 menit sehari, 8.342 kata, 650 pola, set latihan format JLPT. Coba gratis 7 hari.",
    url: "https://www.honixjlpt.com",
    images: [{ url: "/og-1200x630.png", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = { themeColor: "#0B0A0C" };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${jakarta.variable} ${manrope.variable} ${spaceGrotesk.variable} ${GeistSans.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-screen app-canvas">
        {children}
        <HonixLevelUp />
        <PencatatError />
        <PencatatWaktu />
        <DaftarSW />
      </body>
    </html>
  );
}
