"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/i18n/context";
import { useFavorites } from "./FavoritesProvider";
import { api } from "@/lib/api";
import { ServiceCard } from "./ServiceCard";
import { Button } from "@/components/ui/button";
import { Info, Star } from "lucide-react";
import type { ServiceRecord } from "@/lib/types";

export function FavoritesView() {
  const { t } = useLang();
  const { slugs, isGuest, loading: favoritesLoading } = useFavorites();
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (favoritesLoading) return;

    if (slugs.length === 0) {
      setServices([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    api.get<ServiceRecord[]>(`/api/services?slugs=${encodeURIComponent(slugs.join(","))}`).then((response) => {
      if (cancelled) return;
      if (!response.ok) {
        console.error("[favorites] failed to resolve services:", response.error);
        setServices([]);
      } else {
        setServices(response.data || []);
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [slugs, favoritesLoading]);

  if (loading || favoritesLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="glass h-56 animate-pulse rounded-2xl" />
        ))}
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <div className="glass rounded-3xl px-6 py-16 text-center">
        <Star className="mx-auto mb-4 h-10 w-10 text-foreground/25" />
        <p className="font-display text-lg font-bold text-white">{t.favorites.empty}</p>
        <p className="mx-auto mt-2 max-w-sm text-sm text-foreground/55">{t.favorites.emptySub}</p>
        <Button asChild className="mt-6 bg-gradient-to-r from-[#4c6fff] to-[#a855f7] text-white">
          <Link href="/catalog">{t.favorites.goCatalog}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {isGuest && (
        <p className="glass flex items-start gap-2 rounded-2xl px-4 py-3 text-xs text-foreground/60">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--neon-cyan)]" />
          {t.favorites.guestNote}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((service, index) => (
          <ServiceCard key={service._id} service={service} delay={index * 40} />
        ))}
      </div>
    </div>
  );
}
