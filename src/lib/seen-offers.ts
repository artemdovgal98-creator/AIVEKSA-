/** Cookie with the Featured Affiliate offer slugs a visitor saw recently (frequency capping). */
export const SEEN_OFFERS_COOKIE = "aivexa_seen_offers";
export const MAX_SEEN_OFFERS = 12;

export function parseSeenOffers(raw: string | undefined): string[] {
  if (!raw) return [];
  try {
    return decodeURIComponent(raw).split(",").map((slug) => slug.trim()).filter(Boolean).slice(0, MAX_SEEN_OFFERS);
  } catch {
    console.warn("[seen-offers] malformed cookie ignored");
    return [];
  }
}
