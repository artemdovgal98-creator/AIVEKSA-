"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/lib/i18n/context";
import { api } from "@/lib/api";
import { categoryName, expandedCategory, pickLocalized, serviceTitle } from "@/lib/localize";
import { publicDict } from "@/lib/i18n/public-dict";
import { ServiceLogo } from "./ServiceCard";
import { useFavorites } from "./FavoritesProvider";
import { Search, Loader2, CornerDownLeft, Mic, MicOff, History, Star, X } from "lucide-react";
import { toast } from "sonner";
import type { ServiceRecord } from "@/lib/types";

const HISTORY_KEY = "aivexa_search_history";
const HISTORY_MAX = 8;
const SPEECH_LANG = { ru: "ru-RU", uk: "uk-UA", en: "en-US" } as const;

function readHistory(): string[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(HISTORY_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((entry) => typeof entry === "string").slice(0, HISTORY_MAX) : [];
  } catch (err) {
    console.error("[search] failed to read history:", err);
    return [];
  }
}

function writeHistory(entries: string[]) {
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, HISTORY_MAX)));
  } catch (err) {
    console.error("[search] failed to save history:", err);
  }
}

/** The Web Speech API constructor, when the browser has one. */
function speechRecognitionCtor(): any {
  if (typeof window === "undefined") return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
}

/**
 * Big hero search with live suggestions, recent searches, favorites quick
 * access and Web Speech voice input (typing is always the fallback).
 */
export function SearchBox({
  size = "lg",
  initialValue = "",
  onSubmitOverride,
}: {
  size?: "lg" | "md";
  initialValue?: string;
  onSubmitOverride?: (value: string) => void;
}) {
  const { lang, t } = useLang();
  const router = useRouter();
  const [value, setValue] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<ServiceRecord[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [favoriteItems, setFavoriteItems] = useState<ServiceRecord[] | null>(null);
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const recognitionRef = useRef<any>(null);
  const { slugs: favoriteSlugs } = useFavorites();
  const p = publicDict(lang).search;
  const containerRef = useRef<HTMLDivElement>(null);
  // Suggestions only ever open after a real interaction. Arriving from a quick
  // category chip pre-fills the field, and an auto-opened panel would sit on
  // top of the results grid the visitor actually came to see.
  const interacted = useRef(false);

  useEffect(() => {
    setHistory(readHistory());
    setVoiceSupported(Boolean(speechRecognitionCtor()));
    return () => recognitionRef.current?.abort?.();
  }, []);

  // Favorites quick access — loaded lazily the first time the empty panel opens.
  useEffect(() => {
    if (!open || value.trim() || favoriteItems !== null) return;
    const first = favoriteSlugs.slice(0, 6);
    if (!first.length) {
      setFavoriteItems([]);
      return;
    }
    api.get<ServiceRecord[]>(`/api/services?slugs=${encodeURIComponent(first.join(","))}`).then((response) => {
      if (!response.ok) console.error("[search] favorites quick access failed:", response.error);
      setFavoriteItems(response.ok ? response.data || [] : []);
    });
  }, [open, value, favoriteItems, favoriteSlugs]);

  const remember = (query: string) => {
    const next = [query, ...readHistory().filter((entry) => entry.toLowerCase() !== query.toLowerCase())].slice(0, HISTORY_MAX);
    writeHistory(next);
    setHistory(next);
  };

  const clearHistory = () => {
    writeHistory([]);
    setHistory([]);
  };

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const query = value.trim();
    if (query.length < 2) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const timer = setTimeout(async () => {
      const response = await api.get<ServiceRecord[]>(
        `/api/services?q=${encodeURIComponent(query)}&limit=6`
      );
      if (!response.ok) {
        console.error("[search] suggestions failed:", response.error);
        setSuggestions([]);
      } else {
        setSuggestions(response.data || []);
      }
      setLoading(false);
      if (interacted.current) setOpen(true);
    }, 250);
    return () => clearTimeout(timer);
  }, [value]);

  const submit = (override?: string) => {
    const query = (override ?? value).trim();
    if (!query) return;
    setOpen(false);
    remember(query);
    console.log("[search] submit:", query);
    if (onSubmitOverride) {
      onSubmitOverride(query);
      return;
    }
    router.push(`/catalog?q=${encodeURIComponent(query)}`);
  };

  const startVoice = () => {
    const Ctor = speechRecognitionCtor();
    if (!Ctor) {
      toast.message(p.voiceUnsupported);
      return;
    }
    if (listening) {
      recognitionRef.current?.stop?.();
      return;
    }
    try {
      const recognition = new Ctor();
      recognition.lang = SPEECH_LANG[lang] || "ru-RU";
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.onresult = (event: any) => {
        const result = event.results[event.results.length - 1];
        const text = String(result?.[0]?.transcript || "").trim();
        if (!text) return;
        interacted.current = true;
        setValue(text);
        if (result.isFinal) {
          console.log("[search] voice query:", text);
          submit(text);
        }
      };
      recognition.onerror = (event: any) => {
        console.error("[search] voice recognition error:", event?.error);
        if (event?.error !== "aborted" && event?.error !== "no-speech") toast.error(p.voiceError);
        setListening(false);
      };
      recognition.onend = () => setListening(false);
      recognitionRef.current = recognition;
      recognition.start();
      setListening(true);
    } catch (err) {
      console.error("[search] voice start failed:", err);
      setListening(false);
      toast.error(p.voiceError);
    }
  };

  const showIdlePanel = open && !value.trim() && (history.length > 0 || (favoriteItems?.length || 0) > 0);
  const tall = size === "lg";

  return (
    <div ref={containerRef} className="relative w-full">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
        className={`glass-strong neon-border flex items-center gap-2 rounded-2xl ${
          tall ? "p-2 sm:p-2.5" : "p-1.5"
        } glow-primary`}
      >
        <Search className={`ml-2 shrink-0 text-foreground/45 ${tall ? "h-5 w-5" : "h-4 w-4"}`} />
        <input
          type="search"
          value={value}
          onChange={(event) => {
            interacted.current = true;
            setValue(event.target.value);
          }}
          onFocus={() => {
            interacted.current = true;
            if (!value.trim() || (value.trim().length >= 2 && suggestions.length > 0)) setOpen(true);
          }}
          placeholder={listening ? p.listening : t.home.searchPlaceholder}
          aria-label={t.home.searchPlaceholder}
          className={`min-w-0 flex-1 bg-transparent text-white placeholder:text-foreground/40 focus:outline-none ${
            tall ? "py-2.5 text-base sm:text-lg" : "py-2 text-sm"
          }`}
        />
        {voiceSupported && (
          <button
            type="button"
            onClick={startVoice}
            aria-label={p.voice}
            title={p.voice}
            className={`flex shrink-0 items-center justify-center rounded-xl transition-all ${tall ? "h-11 w-11" : "h-9 w-9"} ${
              listening
                ? "bg-rose-500/20 text-rose-300 shadow-[0_0_18px_-4px_rgba(244,63,94,0.8)]"
                : "text-foreground/55 hover:bg-white/8 hover:text-white"
            }`}
          >
            {listening ? <MicOff className="h-4.5 w-4.5" /> : <Mic className="h-4.5 w-4.5" />}
          </button>
        )}
        <button
          type="submit"
          className={`shrink-0 rounded-xl bg-gradient-to-r from-[#4c6fff] to-[#a855f7] font-semibold text-white transition-all hover:shadow-[0_12px_34px_-14px_rgba(124,145,255,1)] ${
            tall ? "px-4 py-3 text-sm sm:px-6 sm:text-base" : "px-3.5 py-2 text-sm"
          }`}
        >
          <span className="hidden sm:inline">{t.home.searchBtn}</span>
          <Search className="h-4 w-4 sm:hidden" />
        </button>
      </form>

      {showIdlePanel && (
        <div className="panel-solid absolute left-0 right-0 top-full z-50 mt-2 max-h-[60vh] overflow-y-auto rounded-2xl p-3">
          {history.length > 0 && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-foreground/45">
                  <History className="h-3.5 w-3.5" />
                  {p.recent}
                </p>
                <button type="button" onClick={clearHistory} className="flex items-center gap-1 text-[11px] text-foreground/45 hover:text-white">
                  <X className="h-3 w-3" />
                  {p.clear}
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {history.map((entry) => (
                  <button
                    key={entry}
                    type="button"
                    onClick={() => {
                      setValue(entry);
                      submit(entry);
                    }}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-foreground/80 transition hover:border-[color:var(--neon-violet)] hover:text-white"
                  >
                    {entry}
                  </button>
                ))}
              </div>
            </div>
          )}
          {(favoriteItems?.length || 0) > 0 && (
            <div className={history.length ? "mt-3 border-t border-white/8 pt-3" : ""}>
              <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-foreground/45">
                <Star className="h-3.5 w-3.5 text-amber-300" />
                {p.favorites}
              </p>
              <div className="grid gap-1 sm:grid-cols-2">
                {favoriteItems!.map((service) => (
                  <button
                    key={service._id}
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      router.push(`/ai/${service.slug}`);
                    }}
                    className="panel-item flex items-center gap-2.5 rounded-xl px-2 py-2 text-left transition-colors"
                  >
                    <ServiceLogo service={service} className="h-8 w-8" />
                    <span className="truncate text-sm font-medium text-white">{serviceTitle(service, lang) || service.slug}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {open && value.trim().length >= 2 && (suggestions.length > 0 || loading) && (
        <div className="panel-solid absolute left-0 right-0 top-full z-50 mt-2 max-h-[60vh] overflow-y-auto rounded-2xl p-1.5">
          {loading && (
            <div className="flex items-center gap-2 px-3 py-3 text-sm text-foreground/60">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t.catalog.loading}
            </div>
          )}
          {!loading &&
            suggestions.map((service) => {
              const category = expandedCategory(service);
              return (
                <button
                  key={service._id}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    remember(value.trim());
                    router.push(`/ai/${service.slug}`);
                  }}
                  className="panel-item flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors"
                >
                  <ServiceLogo service={service} className="h-9 w-9" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-white">{serviceTitle(service, lang) || service.slug}</span>
                    <span className="block truncate text-xs text-foreground/55">
                      {category ? `${category.icon} ${categoryName(category, lang)} · ` : ""}
                      {pickLocalized(service, "description", lang)}
                    </span>
                  </span>
                </button>
              );
            })}
          {!loading && suggestions.length > 0 && (
            <button
              type="button"
              onClick={() => submit()}
              className="panel-item flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-[color:var(--neon-cyan)] transition-colors"
            >
              <CornerDownLeft className="h-4 w-4" />
              {t.catalog.title}: “{value.trim()}”
            </button>
          )}
        </div>
      )}
    </div>
  );
}
