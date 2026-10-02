"use client";

import { useEffect } from "react";
import { MAX_SEEN_OFFERS, SEEN_OFFERS_COOKIE, parseSeenOffers } from "@/lib/seen-offers";

/**
 * Frequency capping for Featured Affiliate AI: remembers the offer slugs that
 * were just shown so the next home render rotates other relevant partners in.
 * Server components can't write cookies, so this tiny client island does it.
 */
export function SeenOffersCookie({ slugs }: { slugs: string[] }) {
  const key = slugs.join(",");
  useEffect(() => {
    if (!key) return;
    const current = document.cookie.split("; ").find((row) => row.startsWith(`${SEEN_OFFERS_COOKIE}=`));
    const previous = parseSeenOffers(current?.split("=")[1]);
    const merged = Array.from(new Set([...key.split(","), ...previous])).slice(0, MAX_SEEN_OFFERS);
    document.cookie = `${SEEN_OFFERS_COOKIE}=${encodeURIComponent(merged.join(","))}; path=/; max-age=21600; samesite=lax`;
    console.log("[featured-affiliate] seen offers:", merged.length);
  }, [key]);
  return null;
}
