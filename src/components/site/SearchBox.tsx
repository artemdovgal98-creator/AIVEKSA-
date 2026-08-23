"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/lib/i18n/context";
import { api } from "@/lib/api";
import { categoryName, expandedCategory, pickLocalized } from "@/lib/localize";
import { ServiceLogo } from "./ServiceCard";
import { Search, Loader2, CornerDownLeft } from "lucide-react";
import type { ServiceRecord } from "@/lib/types";

/** Big hero search with live suggestions. */
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
  const containerRef = useRef<HTMLDivElement>(null);

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
      setOpen(true);
    }, 250);
    return () => clearTimeout(timer);
  }, [value]);

  const submit = () => {
    const query = value.trim();
    if (!query) return;
    setOpen(false);
    if (onSubmitOverride) {
      onSubmitOverride(query);
      return;
    }
    router.push(`/catalog?q=${encodeURIComponent(query)}`);
  };

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
          onChange={(event) => setValue(event.target.value)}
          onFocus={() => value.trim().length >= 2 && setOpen(true)}
          placeholder={t.home.searchPlaceholder}
          aria-label={t.home.searchPlaceholder}
          className={`min-w-0 flex-1 bg-transparent text-white placeholder:text-foreground/40 focus:outline-none ${
            tall ? "py-2.5 text-base sm:text-lg" : "py-2 text-sm"
          }`}
        />
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

      {open && (suggestions.length > 0 || loading) && (
        <div className="glass-strong absolute left-0 right-0 top-full z-40 mt-2 max-h-[60vh] overflow-y-auto rounded-2xl border border-white/12 p-1.5 shadow-2xl">
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
                    router.push(`/ai/${service.slug}`);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors hover:bg-white/8"
                >
                  <ServiceLogo service={service} className="h-9 w-9" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-white">{service.name}</span>
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
              onClick={submit}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-[color:var(--neon-cyan)] transition-colors hover:bg-white/8"
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
