/* Service worker Honix — minimal, syarat biar bisa dipasang (PWA).
   Sengaja GAK nyimpen cache halaman/data: soal, progres, dan pembayaran harus
   selalu dari server, dan cache yang basi abis deploy lebih bahaya daripada
   gak ada cache. Semua request diterusin apa adanya ke jaringan. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
