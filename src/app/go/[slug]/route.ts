import { NextResponse } from "next/server";
import { getServiceBySlug } from "@/lib/catalog";
import { getOfferBySlug, getPrimaryLiveOffer, offerIsLive } from "@/lib/offers";
import { trackedRedirect } from "@/lib/go-redirect";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { safeHttpUrl } from "@/lib/url-safety";

export const dynamic = "force-dynamic";

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,120}$/i;

/**
 * Outbound redirect + real click tracking.
 *
 *  /go/<service-slug>  → the service's primary live affiliate offer when the
 *                        partner toggle is ON, otherwise its official website.
 *  /go/<offer-slug>    → that affiliate offer (Affiliate Marketplace links).
 *
 * Destinations only ever come from the database and must be absolute http(s)
 * URLs, so this route can never be abused as an open redirect.
 */
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const origin = new URL(request.url).origin;
  if (!SLUG_RE.test(slug)) return NextResponse.redirect(`${origin}/catalog`, 302);

  // Bursts from one IP still get redirected, they just stop inflating click stats.
  const countable = rateLimit(`go:${clientIp(request)}`, 40, 60_000);

  try {
    const service = await getServiceBySlug(slug);
    if (service && service.active !== "no") {
      const offer = service.is_affiliate === "yes" ? await getPrimaryLiveOffer(service._id) : null;
      const affiliateUrl = offer ? safeHttpUrl(offer.affiliate_url) : null;
      const target = affiliateUrl || safeHttpUrl(service.official_url);
      if (!target) {
        console.warn("[go] service has no valid target url:", slug);
        return NextResponse.redirect(`${origin}/ai/${service.slug}`, 302);
      }
      console.log(`[go] ${slug} → ${affiliateUrl ? "partner offer" : "official site"}`);
      return trackedRedirect(request, { target, serviceId: service._id, offer: affiliateUrl ? offer : null, countable });
    }

    const offer = await getOfferBySlug(slug);
    if (offer) {
      const serviceRef = offer.service;
      const serviceId = serviceRef && typeof serviceRef === "object" ? serviceRef._id : (serviceRef as string | undefined);
      const serviceSlug = serviceRef && typeof serviceRef === "object" ? serviceRef.slug : "";
      const target = offerIsLive(offer) ? safeHttpUrl(offer.affiliate_url) : null;
      if (!target) {
        console.warn("[go] offer is not live:", slug, offer.status);
        return NextResponse.redirect(serviceSlug ? `${origin}/ai/${serviceSlug}` : `${origin}/offers`, 302);
      }
      console.log(`[go] offer ${slug} → partner url`);
      return trackedRedirect(request, { target, serviceId, offer, countable });
    }

    console.warn("[go] unknown slug:", slug);
    return NextResponse.redirect(`${origin}/catalog`, 302);
  } catch (err) {
    console.error("[go] failed for", slug, err);
    return NextResponse.redirect(`${origin}/ai/${slug}`, 302);
  }
}
