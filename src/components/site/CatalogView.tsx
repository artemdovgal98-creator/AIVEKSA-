"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/lib/i18n/context";
import { api } from "@/lib/api";
import { categoryName } from "@/lib/localize";
import { ServiceCard } from "./ServiceCard";
import { SearchBox } from "./SearchBox";
import { Button } from "@/components/ui/button";
import { Loader2, SlidersHorizontal, X } from "lucide-react";
import type { CategoryRecord, ServiceRecord } from "@/lib/types";

const PAGE_SIZE = 12;

export function CatalogView({
  initialQuery = "",
  initialCategory = "",
  initialFilter = "all",
  initialSort = "popular",
  lockedCategory = false,
}: {
  initialQuery?: string;
  initialCategory?: string;
  initialFilter?: string;
  initialSort?: string;
  lockedCategory?: boolean;
}) {
  const { lang, t } = useLang();
  const router = useRouter();

  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState(initialCategory);
  const [filter, setFilter] = useState(initialFilter);
  const [sort, setSort] = useState(initialSort);
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [items, setItems] = useState<ServiceRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const filters = [
    { id: "all", label: t.catalog.filterAll },
    { id: "free", label: t.catalog.filterFree },
    { id: "has_free", label: t.catalog.filterHasFree },
    { id: "paid", label: t.catalog.filterPaid },
    { id: "popular", label: t.catalog.filterPopular },
    { id: "new", label: t.catalog.filterNew },
    { id: "top_rated", label: t.catalog.filterTopRated },
  ];

  const sorts = [
    { id: "popular", label: t.catalog.sortPopular },
    { id: "rating", label: t.catalog.sortRating },
    { id: "new", label: t.catalog.sortNew },
    { id: "name", label: t.catalog.sortName },
  ];

  useEffect(() => {
    api.get<CategoryRecord[]>("/api/categories").then((response) => {
      if (!response.ok) {
        console.error("[catalog] failed to load categories:", response.error);
        return;
      }
      setCategories(response.data || []);
    });
  }, []);

  const buildUrl = useCallback(
    (nextOffset: number) => {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (category) params.set("category", category);
      if (filter && filter !== "all") params.set("filter", filter);
      if (sort) params.set("sort", sort);
      params.set("limit", String(PAGE_SIZE));
      params.set("offset", String(nextOffset));
      return `/api/services?${params.toString()}`;
    },
    [query, category, filter, sort]
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setOffset(0);

    const timer = setTimeout(async () => {
      const response = await api.get<ServiceRecord[]>(buildUrl(0));
      if (cancelled) return;
      if (!response.ok) {
        console.error("[catalog] failed to load services:", response.error);
        setItems([]);
        setTotal(0);
      } else {
        setItems(response.data || []);
        setTotal(response.total || 0);
      }
      setLoading(false);
    }, 200);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [buildUrl]);

  // Keep the address bar in sync so results stay shareable / indexable.
  useEffect(() => {
    if (lockedCategory) return;
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (category) params.set("category", category);
    if (filter && filter !== "all") params.set("filter", filter);
    if (sort !== "popular") params.set("sort", sort);
    const search = params.toString();
    window.history.replaceState(null, "", search ? `/catalog?${search}` : "/catalog");
  }, [query, category, filter, sort, lockedCategory]);

  const loadMore = async () => {
    setLoadingMore(true);
    const nextOffset = offset + PAGE_SIZE;
    const response = await api.get<ServiceRecord[]>(buildUrl(nextOffset));
    if (!response.ok) {
      console.error("[catalog] failed to load more:", response.error);
    } else {
      setItems((current) => [...current, ...(response.data || [])]);
      setOffset(nextOffset);
    }
    setLoadingMore(false);
  };

  const resetAll = () => {
    setQuery("");
    if (!lockedCategory) setCategory("");
    setFilter("all");
    setSort("popular");
  };

  const activeFilters = (query ? 1 : 0) + (filter !== "all" ? 1 : 0) + (!lockedCategory && category ? 1 : 0);

  return (
    <div className="space-y-5">
      <SearchBox size="md" initialValue={initialQuery} onSubmitOverride={(value) => setQuery(value)} />

      {/* Filter bar */}
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={() => setShowFilters((value) => !value)}
          className="glass glass-hover flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold md:hidden"
        >
          <SlidersHorizontal className="h-4 w-4" />
          {t.catalog.filters}
          {activeFilters > 0 && (
            <span className="rounded-full bg-[color:var(--neon-blue)] px-1.5 text-[11px] text-white">
              {activeFilters}
            </span>
          )}
        </button>

        <div className="rail no-scrollbar hidden min-w-0 flex-1 md:flex">
          {filters.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => setFilter(entry.id)}
              className={`shrink-0 rounded-xl px-3.5 py-2 text-[13px] font-semibold transition-all ${
                filter === entry.id
                  ? "bg-gradient-to-r from-[#4c6fff] to-[#a855f7] text-white shadow-[0_10px_28px_-14px_rgba(124,145,255,1)]"
                  : "glass text-foreground/70 hover:text-white"
              }`}
            >
              {entry.label}
            </button>
          ))}
        </div>

        <select
          value={sort}
          onChange={(event) => setSort(event.target.value)}
          aria-label={t.catalog.sort}
          className="glass ml-auto shrink-0 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-foreground/85 focus:outline-none"
        >
          {sorts.map((entry) => (
            <option key={entry.id} value={entry.id} className="bg-[#161626] text-white">
              {entry.label}
            </option>
          ))}
        </select>
      </div>

      {/* Mobile filter drawer */}
      {showFilters && (
        <div className="panel-solid space-y-4 rounded-2xl p-4 md:hidden">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground/50">
              {t.catalog.filters}
            </p>
            <div className="flex flex-wrap gap-2">
              {filters.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => setFilter(entry.id)}
                  className={`rounded-xl px-3 py-2 text-[13px] font-semibold transition-all ${
                    filter === entry.id
                      ? "bg-gradient-to-r from-[#4c6fff] to-[#a855f7] text-white"
                      : "bg-white/6 text-foreground/70"
                  }`}
                >
                  {entry.label}
                </button>
              ))}
            </div>
          </div>

          {!lockedCategory && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground/50">
                {t.catalog.allCategories}
              </p>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="w-full rounded-xl bg-white/6 px-3 py-2.5 text-sm text-white focus:outline-none"
              >
                <option value="" className="bg-[#161626]">
                  {t.catalog.allCategories}
                </option>
                {categories.map((entry) => (
                  <option key={entry._id} value={entry.slug} className="bg-[#161626]">
                    {entry.icon} {categoryName(entry, lang)}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Desktop category chips */}
      {!lockedCategory && (
        <div className="rail no-scrollbar hidden md:flex">
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
              onClick={() => setCategory(entry.slug)}
              className={`shrink-0 rounded-xl px-3 py-2 text-[13px] font-medium transition-all ${
                category === entry.slug ? "bg-white/14 text-white" : "glass text-foreground/65 hover:text-white"
              }`}
            >
              {entry.icon} {categoryName(entry, lang)}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between text-sm text-foreground/55">
        <span>
          {t.catalog.found}: <span className="font-semibold text-white">{total}</span> {t.catalog.services}
        </span>
        {activeFilters > 0 && (
          <button
            type="button"
            onClick={resetAll}
            className="flex items-center gap-1 font-medium text-foreground/70 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
            {t.catalog.reset}
          </button>
        )}
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="glass h-56 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="glass rounded-2xl px-6 py-16 text-center">
          <p className="font-display text-lg font-bold text-white">{t.catalog.noResults}</p>
          <p className="mt-2 text-sm text-foreground/55">{t.catalog.noResultsSub}</p>
          <Button onClick={resetAll} className="mt-5 bg-gradient-to-r from-[#4c6fff] to-[#a855f7] text-white">
            {t.catalog.reset}
          </Button>
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((service, index) => (
              <ServiceCard key={service._id} service={service} delay={Math.min(index, 8) * 35} />
            ))}
          </div>

          {items.length < total && (
            <div className="flex justify-center pt-2">
              <Button
                onClick={loadMore}
                disabled={loadingMore}
                variant="outline"
                className="border-white/15 bg-white/5 px-8"
              >
                {loadingMore && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {items.length} / {total}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
