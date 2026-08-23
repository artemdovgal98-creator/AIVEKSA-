"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useSession } from "@/lib/auth-client";
import { api } from "@/lib/api";
import type { ServiceRecord } from "@/lib/types";

const STORAGE_KEY = "aivexa_favorites";

interface FavoritesValue {
  slugs: string[];
  isFavorite: (slug: string) => boolean;
  toggle: (service: Pick<ServiceRecord, "_id" | "slug">) => Promise<void>;
  loading: boolean;
  isGuest: boolean;
  reload: () => void;
}

const FavoritesContext = createContext<FavoritesValue>({
  slugs: [],
  isFavorite: () => false,
  toggle: async () => {},
  loading: true,
  isGuest: true,
  reload: () => {},
});

function readGuestFavorites(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((slug) => typeof slug === "string") : [];
  } catch (err) {
    console.error("[favorites] failed to read local storage:", err);
    return [];
  }
}

function writeGuestFavorites(slugs: string[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(slugs));
  } catch (err) {
    console.error("[favorites] failed to write local storage:", err);
  }
}

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession();
  const [slugs, setSlugs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const isGuest = !session?.user;

  useEffect(() => {
    if (isPending) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      if (session?.user) {
        const response = await api.get<ServiceRecord[]>("/api/favorites");
        if (cancelled) return;
        if (!response.ok) {
          console.error("[favorites] failed to load from server:", response.error);
          setSlugs([]);
        } else {
          setSlugs((response.data || []).map((service) => service.slug));
        }
      } else {
        setSlugs(readGuestFavorites());
      }
      if (!cancelled) setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id, isPending, tick]);

  const toggle = useCallback(
    async (service: Pick<ServiceRecord, "_id" | "slug">) => {
      const active = slugs.includes(service.slug);
      const next = active ? slugs.filter((slug) => slug !== service.slug) : [...slugs, service.slug];
      setSlugs(next);

      if (session?.user) {
        const response = active
          ? await api.delete(`/api/favorites?service_id=${encodeURIComponent(service._id)}`)
          : await api.post("/api/favorites", { service_id: service._id });
        if (!response.ok) {
          console.error("[favorites] server sync failed, reverting:", response.error);
          setSlugs(slugs);
        }
      } else {
        writeGuestFavorites(next);
      }
      console.log("[favorites] toggled", service.slug, "→", !active);
    },
    [slugs, session?.user?.id]
  );

  const value = useMemo<FavoritesValue>(
    () => ({
      slugs,
      isFavorite: (slug: string) => slugs.includes(slug),
      toggle,
      loading,
      isGuest,
      reload: () => setTick((value) => value + 1),
    }),
    [slugs, toggle, loading, isGuest]
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  return useContext(FavoritesContext);
}
