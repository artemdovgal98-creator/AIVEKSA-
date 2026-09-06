import { NextResponse } from "next/server";
import { headers, cookies } from "next/headers";
import { getOfferById } from "@/lib/offers";
import { getSessionUser } from "@/lib/admin-auth";
import { totalumSdk } from "@/lib/totalum";
import { LANG_COOKIE } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

function detectDevice(userAgent: string): "mobile" | "tablet" | "desktop" {
  const ua = userAgent.toLowerCase();
  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/.test(ua)) return "tablet";
  if (/mobi|iphone|ipod|android|blackberry|opera mini|iemobile/.test(ua)) return "mobile";
  return "desktop";
}

/**
 * Outbound redirect for a single affiliate offer.
 * Every offer element in the app links here, so the visitor always lands on
 * the exact URL the owner saved for that offer — and the click is tracked.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const origin = new URL(request.url).origin;

  try {
    const offer = await getOfferById(id);
    if (!offer) {
      console.warn("[go/offer] unknown offer:", id);
      return NextResponse.redirect(`${origin}/offers`, 302);
    }

    const targetUrl = String(offer.affiliate_url || "").trim();
    if (!targetUrl || offer.active === "no") {
      console.warn("[go/offer] offer has no live affiliate url:", id);
      return NextResponse.redirect(`${origin}/offers`, 302);
    }

    const headerList = await headers();
    const cookieStore = await cookies();
    const sessionUser = await getSessionUser();

    const country =
      headerList.get("cf-ipcountry") ||
      headerList.get("x-vercel-ip-country") ||
      headerList.get("x-country-code") ||
      "";

    const clickData: Record<string, any> = {
      offer: offer._id,
      clicked_at: new Date().toISOString(),
      language: cookieStore.get(LANG_COOKIE)?.value || "",
      device: detectDevice(headerList.get("user-agent") || ""),
      target_url: targetUrl,
      affiliate_click: "yes",
    };
    const service = offer.service;
    const serviceId = service && typeof service === "object" ? service._id : service;
    if (serviceId) clickData.service = serviceId;
    if (country && country !== "XX") clickData.country = country;
    if (sessionUser?.id) clickData.user = sessionUser.id;

    const created = await totalumSdk.crud.createRecord("clicks", clickData);
    if (created.errors) console.error("[go/offer] click record errors:", created.errors);
    console.log(`[go/offer] click tracked for "${offer.offer_name}" → ${targetUrl}`);

    return NextResponse.redirect(targetUrl, 302);
  } catch (err: any) {
    console.error("[go/offer] failed to handle offer", id, err);
    return NextResponse.redirect(`${origin}/offers`, 302);
  }
}
