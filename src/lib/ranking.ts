import "server-only";
import { totalumSdk } from "@/lib/totalum";
import { getRankingWeights } from "@/lib/settings";
import { attachPartnerOffers, crOf, loadOfferMetrics, offerIsLive, revenueScalar, sortByPrimary } from "@/lib/offers";
import type { AffiliateOfferRecord, RankingWeights, ServiceRecord } from "@/lib/types";

/**
 * Affiliate ranking — relevance first, money last.
 *
 *   score = Σ weight_i × normalised_i   (default: relevance 45 · performance 20 ·
 *           CR 10 · EPC 10 · payout 5 · popularity 5 · quality 5)
 *
 * Guarantees:
 *  - candidates are grouped into relevance tiers BEFORE scoring, so a strongly
 *    relevant offer is never pushed down by a better-paying irrelevant one;
 *  - offers with zero relevance are never shown in a relevance context;
 *  - a small seeded jitter + a penalty for recently shown offers rotates near
 *    ties, so the same offer is not always first (frequency capping).
 */

export interface UserAffinity {
  /** categoryId → weight 0..1 from favorites, opened services and affiliate clicks. */
  categories: Map<string, number>;
  /** Services the user already saved — not re-recommended. */
  favoriteServiceIds: Set<string>;
}

const refId = (value: any): string => (value && typeof value === "object" ? value._id : value) || "";

/** Real activity of a signed-in user. Guests get an empty (neutral) affinity. */
export async function loadUserAffinity(userId: string | null | undefined): Promise<UserAffinity> {
  const affinity: UserAffinity = { categories: new Map(), favoriteServiceIds: new Set() };
  if (!userId) return affinity;
  try {
    const [favorites, clicks] = await Promise.all([
      totalumSdk.crud.query("favorites", { _filter: { user: userId }, _limit: 100, service: true }),
      totalumSdk.crud.query("clicks", {
        _filter: { user: userId, manual_entry: { ne: "yes" } },
        _sort: { clicked_at: "desc" },
        _limit: 60,
        service: true,
      }),
    ]);
    const bump = (categoryId: string, amount: number) => {
      if (!categoryId) return;
      affinity.categories.set(categoryId, (affinity.categories.get(categoryId) || 0) + amount);
    };
    for (const row of (favorites.data || []) as any[]) {
      if (row.service?._id) affinity.favoriteServiceIds.add(row.service._id);
      bump(refId(row.service?.category), 3);
    }
    for (const row of (clicks.data || []) as any[]) bump(refId(row.service?.category), 1);
    const max = Math.max(1, ...affinity.categories.values());
    for (const [key, value] of affinity.categories) affinity.categories.set(key, value / max);
  } catch (err) {
    console.error("[ranking] affinity load failed (neutral ranking used):", err);
  }
  return affinity;
}

function seededRandom(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface RankedOffer {
  service: ServiceRecord;
  offer: AffiliateOfferRecord;
  relevance: number;
  score: number;
}

/**
 * Featured Affiliate AI for the home page. Relevance comes from real user
 * activity (category affinity); without activity every offer is equally
 * relevant (neutral 0.5) and performance decides — never payout alone.
 */
export async function rankFeaturedAffiliate(options: {
  userId?: string | null;
  visitorSeed: string;
  recentlyShown?: string[];
  limit?: number;
}): Promise<RankedOffer[]> {
  const { userId, visitorSeed, recentlyShown = [], limit = 4 } = options;
  const [weights, affinity, metrics, offersResult] = await Promise.all([
    getRankingWeights(),
    loadUserAffinity(userId),
    loadOfferMetrics().catch((err) => {
      console.error("[ranking] metrics unavailable:", err);
      return new Map();
    }),
    totalumSdk.crud.query("affiliate_offers", { _filter: { active: "yes" }, _limit: 1000, service: true }),
  ]);
  if (offersResult.errors) {
    console.error("[ranking] offers query failed:", offersResult.errors);
    return [];
  }

  // One candidate per service — its primary live offer.
  const byService = new Map<string, { service: ServiceRecord; offer: AffiliateOfferRecord }>();
  for (const offer of sortByPrimary((offersResult.data || []) as unknown as AffiliateOfferRecord[])) {
    const service = offer.service && typeof offer.service === "object" ? (offer.service as ServiceRecord) : null;
    if (!service || service.active === "no" || service.is_affiliate !== "yes") continue;
    if (!offerIsLive(offer) || byService.has(service._id)) continue;
    if (affinity.favoriteServiceIds.has(service._id)) continue;
    byService.set(service._id, { service, offer });
  }
  const candidates = Array.from(byService.values());
  if (!candidates.length) return [];

  const hasAffinity = affinity.categories.size > 0;
  const relevanceOf = (service: ServiceRecord) =>
    hasAffinity ? affinity.categories.get(refId(service.category)) || 0.15 : 0.5;

  const raw = candidates.map(({ service, offer }) => {
    const m = metrics.get(offer._id);
    const clicks = m?.clicks || 0;
    return {
      service,
      offer,
      relevance: relevanceOf(service),
      performance: clicks,
      cr: crOf(m) || 0,
      epc: clicks ? revenueScalar(m!.revenue) / clicks : 0,
      payout: Number(offer.payout) || 0,
      popularity: Number(service.popularity) || 0,
      quality: Number(offer.quality_score) > 0 ? Number(offer.quality_score) / 100 : (Number(service.rating) || 0) / 5,
    };
  });

  const maxOf = (key: "performance" | "cr" | "epc" | "payout" | "popularity") =>
    Math.max(...raw.map((entry) => entry[key]), 0) || 1;
  const max = {
    performance: maxOf("performance"),
    cr: maxOf("cr"),
    epc: maxOf("epc"),
    payout: maxOf("payout"),
    popularity: maxOf("popularity"),
  };
  const total = Object.values(weights).reduce((sum, value) => sum + value, 0) || 100;
  const w = (key: keyof RankingWeights) => weights[key] / total;
  const random = seededRandom(`${visitorSeed}:${new Date().toISOString().slice(0, 13)}`);
  const recent = new Set(recentlyShown);

  const scored: RankedOffer[] = raw.map((entry) => {
    let score =
      w("relevance") * entry.relevance +
      w("performance") * (entry.performance / max.performance) +
      w("cr") * (entry.cr / max.cr) +
      w("epc") * (entry.epc / max.epc) +
      w("payout") * (entry.payout / max.payout) +
      w("popularity") * (entry.popularity / max.popularity) +
      w("quality") * Math.min(entry.quality, 1);
    score += random() * 0.06; // rotation among near ties
    if (recent.has(entry.offer.offer_slug || "")) score -= 0.12; // frequency cap
    return { service: entry.service, offer: entry.offer, relevance: entry.relevance, score };
  });

  const tier = (relevance: number) => (relevance >= 0.7 ? 2 : relevance >= 0.35 ? 1 : 0);
  scored.sort((a, b) => tier(b.relevance) - tier(a.relevance) || b.score - a.score);

  // Sponsored offers may take at most ONE slot, and only if they are in the
  // same relevance tier as the organic leader.
  const picked: RankedOffer[] = [];
  let sponsoredUsed = false;
  for (const entry of scored) {
    const sponsored = entry.offer.sponsored === "yes";
    if (sponsored && (sponsoredUsed || tier(entry.relevance) < tier(scored[0].relevance))) continue;
    if (sponsored) sponsoredUsed = true;
    picked.push(entry);
    if (picked.length >= limit) break;
  }

  // Cards need the expanded category + the public partner_offer shape.
  const ids = picked.map((entry) => entry.service._id);
  const full = await totalumSdk.crud.query("services", { _filter: { _id: { in: ids } }, _limit: ids.length, category: true });
  const byId = new Map(((full.data || []) as unknown as ServiceRecord[]).map((service) => [service._id, service]));
  const withOffers = await attachPartnerOffers(picked.map((entry) => byId.get(entry.service._id) || entry.service));
  console.log(`[ranking] featured affiliate: ${picked.length}/${candidates.length} (affinity=${hasAffinity})`);
  return picked.map((entry, index) => ({ ...entry, service: withOffers[index] }));
}

/**
 * Recommended AI (organic, never affiliate-driven): services in the user's
 * favourite categories, otherwise the admin's featured picks.
 */
export async function getRecommendedServices(userId: string | null | undefined, limit = 6): Promise<ServiceRecord[]> {
  const affinity = await loadUserAffinity(userId);
  const topCategories = Array.from(affinity.categories.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id]) => id);

  const filter: Record<string, any> = { active: "yes" };
  if (topCategories.length) filter.category = { in: topCategories };
  else filter.featured = "yes";
  if (affinity.favoriteServiceIds.size) filter._id = { nin: Array.from(affinity.favoriteServiceIds) };

  const result = await totalumSdk.crud.query("services", {
    _filter: filter,
    _sort: { rating: "desc" },
    _limit: limit,
    category: true,
  });
  if (result.errors) {
    console.error("[ranking] recommended query failed:", result.errors);
    return [];
  }
  let rows = (result.data || []) as unknown as ServiceRecord[];
  if (!rows.length && !topCategories.length) {
    // No editors' picks yet — fall back to the best-rated active services.
    const fallback = await totalumSdk.crud.query("services", { _filter: { active: "yes" }, _sort: { rating: "desc" }, _limit: limit, category: true });
    if (fallback.errors) console.error("[ranking] recommended fallback failed:", fallback.errors);
    rows = (fallback.data || []) as unknown as ServiceRecord[];
  }
  return attachPartnerOffers(rows);
}

