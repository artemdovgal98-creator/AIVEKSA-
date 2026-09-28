import { NextResponse } from "next/server";
import { getOfferById, offerIsLive } from "@/lib/offers";
import { recordClick } from "@/lib/click-tracking";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { safeHttpUrl } from "@/lib/url-safety";

export const dynamic = "force-dynamic";

/** Legacy offer redirect by id — kept so every previously shared link keeps working. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const origin = new URL(request.url).origin;
  const countable = rateLimit(`go:${clientIp(request)}`, 40, 60_000);

  try {
    const offer = await getOfferById(id);
    const target = offer && offerIsLive(offer) ? safeHttpUrl(offer.affiliate_url) : null;
    if (!offer || !target) {
      console.warn("[go/offer] offer missing or not live:", id);
      return NextResponse.redirect(`${origin}/offers`, 302);
    }
    const serviceRef = offer.service;
    const serviceId = serviceRef && typeof serviceRef === "object" ? serviceRef._id : (serviceRef as string | undefined);
    if (countable) await recordClick({ serviceId, offerId: offer._id, targetUrl: target, affiliate: true });
    console.log(`[go/offer] "${offer.offer_name}" → partner url`);
    return NextResponse.redirect(target, 302);
  } catch (err) {
    console.error("[go/offer] failed for", id, err);
    return NextResponse.redirect(`${origin}/offers`, 302);
  }
}
