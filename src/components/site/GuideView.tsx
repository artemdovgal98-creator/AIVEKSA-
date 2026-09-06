"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useLang } from "@/lib/i18n/context";
import { articleCover, categoryName } from "@/lib/localize";
import { CalendarDays, Search, X } from "lucide-react";
import type { ArticleRecord, CategoryRecord } from "@/lib/types";

const PAGE_SIZE = 18;

function formatDate(value: string | undefined, lang: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const locale = lang === "en" ? "en-GB" : lang === "uk" ? "uk-UA" : "ru-RU";
  return date.toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" });
}

/**
 * Searchable article library. Built for a growing volume of guides: instant
 * text search, a category rail and progressive "show more" paging.
 */
export function GuideView({ articles }: { articles: ArticleRecord[] }) {
  const { lang, t } = useLang();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [visible, setVisible] = useState(PAGE_SIZE);

  const categories = useMemo(() => {
    const map = new Map<string, CategoryRecord>();
    for (const article of articles) {
      const entry = article.category;
      if (entry && typeof entry === "object") map.set((entry as CategoryRecord)._id, entry as CategoryRecord);
    }
    return Array.from(map.values());
  }, [articles]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return articles.filter((article) => {
      if (category) {
        const entry = article.category;
        const id = entry && typeof entry === "object" ? (entry as CategoryRecord)._id : entry;
        if (id !== category) return false;
      }
      if (!term) return true;
      return [article.title, article.description, article.content]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [articles, query, category]);

  const shown = filtered.slice(0, visible);

  return (
    <div className="space-y-5">
      <div className="glass flex min-w-0 items-center gap-2 rounded-2xl px-4 py-3">
        <Search className="h-4 w-4 shrink-0 text-foreground/40" />
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setVisible(PAGE_SIZE);
          }}
          placeholder={t.common.search}
          className="w-full min-w-0 bg-transparent text-sm text-white placeholder:text-foreground/30 focus:outline-none"
        />
        {query && (
          <button type="button" onClick={() => setQuery("")} aria-label={t.catalog.reset}>
            <X className="h-4 w-4 shrink-0 text-foreground/45 hover:text-white" />
          </button>
        )}
      </div>

      {categories.length > 0 && (
        <div className="rail no-scrollbar flex">
          <button
            type="button"
            onClick={() => setCategory("")}
            className={`shrink-0 rounded-xl px-3 py-2 text-[13px] font-medium transition-all ${
              category === "" ? "bg-white/14 text-white" : "glass text-foreground/65 hover:text-white"
            }`}
          >
            {t.catalog.allCategories}
          </button>
          {categories.map((entry) => (
            <button
              key={entry._id}
              type="button"
              onClick={() => {
                setCategory(entry._id);
                setVisible(PAGE_SIZE);
              }}
              className={`shrink-0 rounded-xl px-3 py-2 text-[13px] font-medium transition-all ${
                category === entry._id ? "bg-white/14 text-white" : "glass text-foreground/65 hover:text-white"
              }`}
            >
              {entry.icon} {categoryName(entry, lang)}
            </button>
          ))}
        </div>
      )}

      <p className="text-sm text-foreground/55">
        {t.catalog.found}: <span className="font-semibold text-white">{filtered.length}</span>
      </p>

      {shown.length === 0 ? (
        <div className="glass rounded-3xl px-6 py-16 text-center text-sm text-foreground/55">{t.guide.empty}</div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((article, index) => {
              const cover = articleCover(article);
              return (
                <Link
                  key={article._id}
                  href={`/guide/${article.slug}`}
                  className="glass glass-hover animate-fade-up group flex min-w-0 flex-col overflow-hidden rounded-2xl"
                  style={{ animationDelay: `${Math.min(index, 9) * 40}ms` }}
                >
                  {cover && (
                    <span className="relative block h-44 overflow-hidden">
                      <img
                        src={cover}
                        alt={article.title}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <span className="absolute inset-0 bg-gradient-to-t from-[#0b0b16] via-transparent to-transparent" />
                    </span>
                  )}
                  <span className="flex min-w-0 flex-1 flex-col p-5">
                    <span className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wide text-foreground/40">
                      <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                      {formatDate(article.createdAt, lang)}
                      <span className="rounded bg-white/8 px-1.5 py-0.5 text-[10px] font-bold text-foreground/60">
                        {(article.language || "ru").toUpperCase()}
                      </span>
                    </span>
                    <span className="font-display mt-2 block break-anywhere text-base font-bold leading-snug text-white">
                      {article.title}
                    </span>
                    {article.description && (
                      <span className="line-clamp-3 mt-2 block break-anywhere text-sm text-foreground/55">
                        {article.description}
                      </span>
                    )}
                    <span className="mt-4 block text-sm font-semibold text-[color:var(--neon-cyan)]">
                      {t.guide.readMore} →
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>

          {filtered.length > visible && (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={() => setVisible((current) => current + PAGE_SIZE)}
                className="glass glass-hover rounded-xl px-8 py-3 text-sm font-semibold text-foreground/80 hover:text-white"
              >
                {shown.length} / {filtered.length}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
