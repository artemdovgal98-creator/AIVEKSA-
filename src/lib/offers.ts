import "server-only";
import { totalumSdk } from "@/lib/totalum";
import { addMoney, type Money } from "@/lib/money";
import { slugify } from "@/lib/localize";
import { safeHttpUrl } from "@/lib/url-safety";
import {
  EARNED_STATUSES,
  LIVE_OFFER_STATUSES,
  type AffiliateNetworkRecord,
  type AffiliateOfferRecord,
  type Currency,
  type ServiceRecord,
} from "@/lib/types";

/**
 * AIVEXA Affiliate Marketplace — server-side access to `affiliate_offers`,
 * the SINGLE authoritative source of affiliate technical data (URLs, networks,
 * offer ids, tracking, status, payout). Services only carry the partner
 * toggle (`is_affiliate`); metrics are computed from real click records.
 *
 * One service may have many offers across networks. The primary offer
 * (`is_primary = yes`) powers the service's partner button.
 */

const clean = (value: unknown) => String(value ?? "").trim();
const refId = (value: any): string => (value && typeof value === "object" ? value._id : value) || "";

export function offerNetwork(offer: AffiliateOfferRecord): AffiliateNetworkRecord | null {
  const network = offer.network;
  return network && typeof network === "object" ? (network as AffiliateNetworkRecord) : null;
}

/** An offer only redirects visitors when enabled, healthy enough and it has a real URL. */
export function offerIsLive(offer: AffiliateOfferRecord): boolean {
  if (offer.active === "no") return false;
  if (offer.status && !LIVE_OFFER_STATUSES.includes(offer.status)) return false;
  return Boolean(safeHttpUrl(offer.affiliate_url));
}

export async function getOfferById(id: string): Promise<AffiliateOfferRecord | null> {
  if (!/^[a-f0-9]{24}$/i.test(id)) return null;
  const result = await totalumSdk.crud.query("affiliate_offers", {
    _filter: { _id: id },
    _limit: 1,
    network: { _omit: { postback_secret: true } },
    service: true,
  });
  if (result.errors) {
    console.error("[offers] getOfferById failed for", id, result.errors);
    throw new Error("Offer lookup failed");
  }
  return (((result.data || []) as unknown as AffiliateOfferRecord[])[0]) || null;
}

export async function getOfferBySlug(slug: string): Promise<AffiliateOfferRecord | null> {
  const result = await totalumSdk.crud.query("affiliate_offers", {
    _filter: { offer_slug: slug },
    _limit: 1,
    network: { _omit: { postback_secret: true } },
    service: true,
  });
  if (result.errors) {
    console.error("[offers] getOfferBySlug failed for", slug, result.errors);
    throw new Error("Offer lookup failed");
  }
  return (((result.data || []) as unknown as AffiliateOfferRecord[])[0]) || null;
}

export async function getServiceOffers(serviceId: string): Promise<AffiliateOfferRecord[]> {
  const result = await totalumSdk.crud.query("affiliate_offers", {
    _filter: { service: serviceId },
    _sort: { order_position: "asc" },
    _limit: 50,
    network: { _omit: { postback_secret: true } },
  });
  if (result.errors) {
    console.error("[offers] getServiceOffers failed for", serviceId, result.errors);
    throw new Error("Offer lookup failed");
  }
  return (result.data || []) as unknown as AffiliateOfferRecord[];
}

/** Primary offer first, then the other offers in admin order. */
export function sortByPrimary(offers: AffiliateOfferRecord[]): AffiliateOfferRecord[] {
  return [...offers].sort(
    (a, b) =>
      Number(b.is_primary === "yes") - Number(a.is_primary === "yes") ||
      (a.order_position ?? 0) - (b.order_position ?? 0)
  );
}

/** The live offer used by the service's partner button, if any. */
export async function getPrimaryLiveOffer(serviceId: string): Promise<AffiliateOfferRecord | null> {
  try {
    const offers = sortByPrimary(await getServiceOffers(serviceId));
    return offers.find(offerIsLive) || null;
  } catch (err) {
    // A failing lookup must never block the redirect — the caller falls back to the official URL.
    console.error("[offers] getPrimaryLiveOffer failed for", serviceId, err);
    return null;
  }
}

/** Every service id that currently has at least one live offer. */
export async function getLiveOfferServiceIds(): Promise<Map<string, AffiliateOfferRecord>> {
  const result = await totalumSdk.crud.query("affiliate_offers", {
    _filter: { active: "yes" },
    _limit: 1000,
    network: { _omit: { postback_secret: true } },
  });
  if (result.errors) {
    console.error("[offers] getLiveOfferServiceIds failed:", result.errors);
    throw new Error("Offer lookup failed");
  }
  const map = new Map<string, AffiliateOfferRecord>();
  for (const offer of sortByPrimary((result.data || []) as unknown as AffiliateOfferRecord[])) {
    const serviceId = refId(offer.service);
    if (!serviceId || !offerIsLive(offer) || map.has(serviceId)) continue;
    map.set(serviceId, offer);
  }
  return map;
}

/**
 * Adds the computed `partner_offer` to catalog cards: only when the partner
 * toggle is ON and a live offer exists. Nothing technical reaches the client.
 */
export async function attachPartnerOffers(services: ServiceRecord[]): Promise<ServiceRecord[]> {
  if (!services.length) return services;
  try {
    const ids = services.map((service) => service._id);
    const result = await totalumSdk.crud.query("affiliate_offers", {
      _filter: { service: { in: ids }, active: "yes" },
      _limit: 500,
    });
    if (result.errors) throw new Error(JSON.stringify(result.errors));
    const byService = new Map<string, AffiliateOfferRecord>();
    for (const offer of sortByPrimary((result.data || []) as unknown as AffiliateOfferRecord[])) {
      const serviceId = refId(offer.service);
      if (offerIsLive(offer) && !byService.has(serviceId)) byService.set(serviceId, offer);
    }
    return services.map((service) => {
      const offer = service.is_affiliate === "yes" ? byService.get(service._id) : undefined;
      // Technical affiliate bookkeeping never reaches public clients.
      const {
        affiliate_offers: _offers,
        affiliate_url: _url,
        affiliate_notes: _notes,
        commission: _commission,
        affiliate_program_url: _program,
        ...rest
      } = service;
      return {
        ...rest,
        partner_offer: offer?.offer_slug ? { slug: offer.offer_slug, sponsored: offer.sponsored === "yes" } : null,
      };
    });
  } catch (err) {
    console.error("[offers] attachPartnerOffers failed:", err);
    return services;
  }
}

/** Live offers for the public offers page. */
export async function getPublicOffers(): Promise<AffiliateOfferRecord[]> {
  const result = await totalumSdk.crud.query("affiliate_offers", {
    _filter: { active: "yes" },
    _sort: { order_position: "asc" },
    _limit: 1000,
    network: { _omit: { postback_secret: true } },
    service: true,
  });
  if (result.errors) {
    console.error("[offers] getPublicOffers errors:", result.errors);
    throw new Error("Offer lookup failed");
  }
  return ((result.data || []) as unknown as AffiliateOfferRecord[]).filter(offerIsLive);
}

export async function getNetworks(): Promise<AffiliateNetworkRecord[]> {
  const result = await totalumSdk.crud.query("affiliate_networks", {
    _sort: { order_position: "asc" },
    _limit: 50,
  });
  if (result.errors) {
    console.error("[offers] getNetworks failed:", result.errors);
    throw new Error("Network lookup failed");
  }
  return (result.data || []) as unknown as AffiliateNetworkRecord[];
}

/** Unique public slug for /go/<slug> — never collides with a service slug. */
export async function uniqueOfferSlug(base: string): Promise<string> {
  const root = slugify(base) || "offer";
  for (let attempt = 0; attempt < 50; attempt++) {
    const candidate = attempt === 0 ? root : `${root}-${attempt + 1}`;
    const [offer, service] = await Promise.all([
      totalumSdk.crud.query("affiliate_offers", { _filter: { offer_slug: candidate }, _limit: 1 }),
      totalumSdk.crud.query("services", { _filter: { slug: candidate }, _limit: 1 }),
    ]);
    if (!(offer.data || []).length && !(service.data || []).length) return candidate;
  }
  return `${root}-${Date.now().toString(36)}`;
}

/**
 * The simple AI Service form writes its "Partner/Affiliate URL" here: the URL
 * goes to the service's primary offer (created under the "Direct" network when
 * the service has none yet). Clearing the field never destroys data — the
 * previous URL is kept in the offer notes and the offer is flagged for review.
 */
export async function setServicePartnerUrl(service: ServiceRecord, rawUrl: string): Promise<AffiliateOfferRecord | null> {
  const url = clean(rawUrl) ? safeHttpUrl(rawUrl) : "";
  if (url === null) throw new Error("Invalid partner URL");

  const offers = sortByPrimary(await getServiceOffers(service._id));
  const primary = offers[0] || null;

  if (primary) {
    const current = clean(primary.affiliate_url);
    if (current === url) return primary;
    const patch: Record<string, any> = { affiliate_url: url, is_primary: "yes" };
    if (url) {
      if (!primary.status || primary.status === "needs_review" || primary.status === "broken") patch.status = "active";
      patch.active = "yes";
    } else {
      patch.status = "needs_review";
      patch.notes = `${clean(primary.notes)}\nPrevious URL (${new Date().toISOString().slice(0, 10)}): ${current}`.trim();
    }
    const updated = await totalumSdk.crud.editRecordById("affiliate_offers", primary._id, patch);
    if (updated.errors) {
      console.error("[offers] primary offer update failed:", updated.errors);
      throw new Error("Offer update failed");
    }
    console.log(`[offers] primary offer ${primary._id} of ${service.slug} → ${url || "(cleared, needs review)"}`);
    return { ...primary, ...patch };
  }

  if (!url) return null;

  const direct = await totalumSdk.crud.query("affiliate_networks", { _filter: { slug: "direct" }, _limit: 1 });
  const networkId = ((direct.data || [])[0] as any)?._id || null;
  const name = clean(service.name) || clean(service.title_ru) || clean(service.title_en) || service.slug;
  const payload = {
    offer_name: name.split(" — ")[0].slice(0, 120),
    external_id: "",
    affiliate_url: url,
    payout_model: "other",
    order_position: 1000,
    active: "yes",
    status: "active",
    is_primary: "yes",
    sponsored: "no",
    offer_slug: await uniqueOfferSlug(`direct-${name.split(" — ")[0]}`),
    network: networkId,
    service: service._id,
  };
  const created = await totalumSdk.crud.createRecord("affiliate_offers", payload);
  if (created.errors) {
    console.error("[offers] primary offer create failed:", created.errors);
    throw new Error("Offer create failed");
  }
  console.log(`[offers] created primary offer for ${service.slug}`);
  return { _id: String((created.data as any)?.insertedId || ""), ...payload } as unknown as AffiliateOfferRecord;
}

// ---------------------------------------------------------------------------
// Metrics — computed from real click / conversion records only.
// ---------------------------------------------------------------------------

export interface OfferMetrics {
  clicks: number;
  conversions: number;
  pendingConversions: number;
  revenue: Money;
}

const emptyMetrics = (): OfferMetrics => ({ clicks: 0, conversions: 0, pendingConversions: 0, revenue: {} });

export async function loadOfferMetrics(sinceIso?: string): Promise<Map<string, OfferMetrics>> {
  const clickFilter: Record<string, any> = { offer: { ne: null }, manual_entry: { ne: "yes" } };
  const convFilter: Record<string, any> = { offer: { ne: null }, conversion_status: { in: ["pending", ...EARNED_STATUSES] } };
  if (sinceIso) {
    clickFilter.clicked_at = { gte: sinceIso };
    convFilter.clicked_at = { gte: sinceIso };
  }

  const [clicks, conversions] = await Promise.all([
    totalumSdk.crud.query("clicks", { _filter: clickFilter, _groupBy: "offer", _aggregate: { _count: true }, _limit: 2000 }),
    totalumSdk.crud.query("clicks", {
      _filter: convFilter,
      _groupBy: ["offer", "currency", "conversion_status"],
      _aggregate: { _count: true, _sum: { earned_amount: true } },
      _limit: 5000,
    }),
  ]);
  if (clicks.errors || conversions.errors) {
    console.error("[offers] metrics query failed:", clicks.errors || conversions.errors);
    throw new Error("Metrics query failed");
  }

  const map = new Map<string, OfferMetrics>();
  const entry = (id: string) => {
    if (!map.has(id)) map.set(id, emptyMetrics());
    return map.get(id)!;
  };
  for (const row of (clicks.data || []) as any[]) {
    const id = refId(row._group?.offer);
    if (id) entry(id).clicks += Number(row._aggregate?._count) || 0;
  }
  for (const row of (conversions.data || []) as any[]) {
    const id = refId(row._group?.offer);
    if (!id) continue;
    const status = row._group?.conversion_status;
    const count = Number(row._aggregate?._count) || 0;
    const sum = Number(row._aggregate?._sum?.earned_amount) || 0;
    const target = entry(id);
    if (status === "pending") target.pendingConversions += count;
    else {
      target.conversions += count;
      addMoney(target.revenue, ((row._group?.currency as Currency) || "usd") as Currency, sum);
    }
  }
  return map;
}

/** Revenue as one number for ratios/ranking only (never displayed as a sum of currencies). */
export function revenueScalar(revenue: Money): number {
  return (revenue.usd || 0) + (revenue.eur || 0);
}

export function epcOf(metrics: OfferMetrics | undefined): Money | null {
  if (!metrics || metrics.clicks === 0) return null;
  const out: Money = {};
  for (const [currency, amount] of Object.entries(metrics.revenue)) {
    out[currency as Currency] = Number(((amount || 0) / metrics.clicks).toFixed(4));
  }
  return out;
}

export function crOf(metrics: OfferMetrics | undefined): number | null {
  if (!metrics || metrics.clicks === 0) return null;
  return metrics.conversions / metrics.clicks;
}
