"use client";

import { useEffect } from "react";

/** Daftarin service worker minimal (public/sw.js) — syarat biar Honix bisa dipasang sebagai aplikasi. */
export function DaftarSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
