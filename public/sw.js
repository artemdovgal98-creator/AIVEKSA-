// Minimal service worker — required by Chrome/Android for the PWA install
// prompt (beforeinstallprompt) to fire. No offline caching is attempted; every
// request simply falls through to the network.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
