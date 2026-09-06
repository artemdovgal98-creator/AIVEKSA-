"use client";

import { useEffect } from "react";

/**
 * Telegram Mini App bootstrap.
 *
 * The bot's menu button and its "🚀 Открыть AIVEXA" button launch the site
 * inside the Telegram client. Telegram only hands the WebApp API to a page that
 * loaded its official script, and a Mini App that never calls `ready()` is shown
 * as a permanently loading sheet — which is exactly how a "broken" Mini App
 * looks. This component loads the script once, reports readiness, expands the
 * sheet to full height and matches the app chrome to the site background.
 *
 * Outside Telegram nothing is injected and the component renders nothing.
 */
export function TelegramMiniApp() {
  useEffect(() => {
    const inTelegram =
      typeof window !== "undefined" &&
      (Boolean((window as any).TelegramWebviewProxy) ||
        window.location.search.includes("tgmini=1") ||
        window.location.hash.includes("tgWebAppData"));

    if (!inTelegram) return;

    const setup = () => {
      const app = (window as any).Telegram?.WebApp;
      if (!app) {
        console.warn("[mini-app] Telegram WebApp API is unavailable");
        return;
      }
      try {
        app.ready();
        app.expand();
        app.setHeaderColor?.("#0b0b16");
        app.setBackgroundColor?.("#0b0b16");
        app.disableVerticalSwipes?.();
        document.documentElement.classList.add("tg-mini-app");
        console.log("[mini-app] ready, version", app.version, "platform", app.platform);
      } catch (err) {
        console.error("[mini-app] initialisation failed:", err);
      }
    };

    if ((window as any).Telegram?.WebApp) {
      setup();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-web-app.js";
    script.async = true;
    script.onload = setup;
    script.onerror = () => console.error("[mini-app] failed to load telegram-web-app.js");
    document.head.appendChild(script);
  }, []);

  return null;
}
