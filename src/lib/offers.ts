import "server-only";
import { totalumSdk } from "@/lib/totalum";
import type { AffiliateNetworkRecord, AffiliateOfferRecord } from "@/lib/types";

/**
 * Server-side access to the affiliate offer inventory.
 *
 * An offer only ever redirects visitors when it is active AND the owner has
 * pasted a real affiliate URL for it in the admin panel — an offer without a
 * link is inventory, not a destination.
 */

export function offerNetwork(offer: AffiliateOfferRecord): AffiliateNetworkRecord | null {
  const network = offer.network;
  return network && typeof network === "object" ? (network as AffiliateNetworkRecord) : null;
}

export function offerIsLive(offer: AffiliateOfferRecord): boolean {
  return offer.active !== "no" && Boolean(String(offer.affiliate_url || "").trim());
}

export async function getOfferById(id: string): Promise<AffiliateOfferRecord | null> {
  try {
    const result = await totalumSdk.crud.query("affiliate_offers", {
      _filter: { _id: id },
      _limit: 1,
      network: true,
      service: true,
    });
    return (((result.data || []) as unknown as AffiliateOfferRecord[])[0]) || null;
  } catch (err) {
    console.error("[offers] getOfferById failed for", id, err);
    throw err;
  }
}

/**
 * The affiliate link bound to a catalog service, if the owner attached one.
 * Used as a fallback by the outbound redirect when the service itself has no
 * own affiliate URL.
 */
export async function getServiceOfferUrl(serviceId: string): Promise<string> {
  try {
    const result = await totalumSdk.crud.query("affiliate_offers", {
      _filter: { service: serviceId, active: "yes" },
      _sort: { order_position: "asc" },
      _limit: 20,
    });
    const offers = (result.data || []) as unknown as AffiliateOfferRecord[];
    const live = offers.find((offer) => String(offer.affiliate_url || "").trim());
    return live ? String(live.affiliate_url).trim() : "";
  } catch (err) {
    console.error("[offers] getServiceOfferUrl failed for", serviceId, err);
    // A failing lookup must never block the redirect — the caller falls back
    // to the official URL.
    return "";
  }
}

/** Networks that have at least one live offer, for the public offers page. */
export async function getPublicOffers(): Promise<AffiliateOfferRecord[]> {
  try {
    const result = await totalumSdk.crud.query("affiliate_offers", {
      _filter: { active: "yes" },
      _sort: { order_position: "asc" },
      _limit: 500,
      network: true,
      service: true,
    });
    if (result.errors) console.error("[offers] getPublicOffers errors:", result.errors);
    const offers = (result.data || []) as unknown as AffiliateOfferRecord[];
    return offers.filter(offerIsLive);
  } catch (err) {
    console.error("[offers] getPublicOffers failed:", err);
    throw err;
  }
}

export async function getNetworks(): Promise<AffiliateNetworkRecord[]> {
  try {
    const result = await totalumSdk.crud.query("affiliate_networks", {
      _sort: { order_position: "asc" },
      _limit: 50,
    });
    return (result.data || []) as unknown as AffiliateNetworkRecord[];
  } catch (err) {
    console.error("[offers] getNetworks failed:", err);
    throw err;
  }
}
