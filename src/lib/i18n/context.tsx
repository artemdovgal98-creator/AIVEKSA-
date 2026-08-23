"use client";

import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { dictionaries, type Dictionary } from "./dictionaries";
import type { Lang } from "@/lib/types";

export const LANG_COOKIE = "aivexa_lang";
const LANG_STORAGE = "aivexa_lang";

interface LangContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: Dictionary;
  ready: boolean;
}

const LangContext = createContext<LangContextValue>({
  lang: "ru",
  setLang: () => {},
  t: dictionaries.ru,
  ready: false,
});

function isLang(v: string | null | undefined): v is Lang {
  return v === "ru" || v === "uk" || v === "en";
}

function readCookieLang(): Lang | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${LANG_COOKIE}=([^;]*)`));
  const value = match ? decodeURIComponent(match[1]) : null;
  return isLang(value) ? value : null;
}

export function LanguageProvider({
  initialLang = "ru",
  children,
}: {
  initialLang?: Lang;
  children: React.ReactNode;
}) {
  const [lang, setLangState] = useState<Lang>(initialLang);
  const [ready, setReady] = useState(false);
  const router = useRouter();

  // Sync from localStorage / cookie / browser on first client render
  useEffect(() => {
    let resolved: Lang | null = null;
    try {
      const stored = window.localStorage.getItem(LANG_STORAGE);
      if (isLang(stored)) resolved = stored;
    } catch (err) {
      console.error("[i18n] localStorage read failed:", err);
    }
    if (!resolved) resolved = readCookieLang();
    if (!resolved) {
      const nav = (navigator.language || "").toLowerCase();
      if (nav.startsWith("uk")) resolved = "uk";
      else if (nav.startsWith("ru")) resolved = "ru";
      else resolved = "en";
    }
    setLangState(resolved);
    document.cookie = `${LANG_COOKIE}=${resolved}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = resolved;
    setReady(true);
    if (resolved !== initialLang) router.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setLang = useCallback((l: Lang) => {
    console.log("[i18n] language changed to", l);
    setLangState(l);
    try {
      window.localStorage.setItem(LANG_STORAGE, l);
    } catch (err) {
      console.error("[i18n] localStorage write failed:", err);
    }
    document.cookie = `${LANG_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = l;
    // Server components read the language from the cookie, so refresh them too.
    router.refresh();
  }, [router]);

  const value = useMemo<LangContextValue>(
    () => ({ lang, setLang, t: dictionaries[lang], ready }),
    [lang, setLang, ready]
  );

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang() {
  return useContext(LangContext);
}
