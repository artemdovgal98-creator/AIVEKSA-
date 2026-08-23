"use client";

import { Star } from "lucide-react";
import { useFavorites } from "./FavoritesProvider";
import { useLang } from "@/lib/i18n/context";
import type { ServiceRecord } from "@/lib/types";

export function FavoriteButton({
  service,
  size = "md",
}: {
  service: Pick<ServiceRecord, "_id" | "slug">;
  size?: "sm" | "md";
}) {
  const { isFavorite, toggle } = useFavorites();
  const { t } = useLang();
  const active = isFavorite(service.slug);
  const dimension = size === "sm" ? "h-8 w-8" : "h-9 w-9";

  return (
    <button
      type="button"
      aria-label={active ? t.card.removeFavorite : t.card.addFavorite}
      title={active ? t.card.removeFavorite : t.card.addFavorite}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        toggle(service);
      }}
      className={`${dimension} flex shrink-0 items-center justify-center rounded-full border transition-all ${
        active
          ? "border-amber-300/50 bg-amber-300/15 text-amber-300 shadow-[0_0_16px_-4px_rgba(252,211,77,0.8)]"
          : "border-white/12 bg-white/5 text-foreground/55 hover:border-amber-300/40 hover:text-amber-300"
      }`}
    >
      <Star className={size === "sm" ? "h-4 w-4" : "h-[18px] w-[18px]"} fill={active ? "currentColor" : "none"} />
    </button>
  );
}
