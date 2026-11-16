// Service worker minimal de HotteList : il ne met rien en cache (le site reste toujours à jour).
// Sa seule raison d'être : permettre aux navigateurs de proposer « Installer l'application ».
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
