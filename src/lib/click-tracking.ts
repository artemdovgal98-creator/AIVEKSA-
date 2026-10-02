import "server-only";
import { headers, cookies } from "next/headers";
import { totalumSdk } from "@/lib/totalum";
import { getSessionUser } from "@/lib/admin-auth";
import { LANG_COOKIE } from "@/lib/i18n/server";
import { describeReferrer } from "@/lib/affiliate-tracking";

function detectDevice(userAgent: string): "mobile" | "tablet" | "desktop" {
  const ua = userAgent.toLowerCase();
  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/.test(ua)) return "tablet";
  if (/mobi|iphone|ipod|android|blackberry|opera mini|iemobile/.test(ua)) return "mobile";
  return "desktop";
}

const BOT_UA = /bot|crawler|spider|slurp|facebookexternalhit|preview|headless|curl|wget/i;

/**
 * Writes one real outbound click. Crawlers are not counted (they are not
 * visitors) and a failing write never blocks the redirect — it is logged.
 */
export async function recordClick(data: {
  serviceId?: string;
  offerId?: string;
  networkId?: string;
  targetUrl: string;
  affiliate: boolean;
  clickId?: string;
  sessionId?: string;
  origin?: string;
}) {
  try {
    const headerList = await headers();
    const userAgent = headerList.get("user-agent") || "";
    if (BOT_UA.test(userAgent)) {
      console.log("[go] crawler click ignored");
      return;
    }
    const cookieStore = await cookies();
    const sessionUser = await getSessionUser();
    // Country only when the hosting platform provides a geo header — never guessed.
    const country =
      headerList.get("cf-ipcountry") || headerList.get("x-vercel-ip-country") || headerList.get("x-country-code") || "";

    const clickData: Record<string, any> = {
      clicked_at: new Date().toISOString(),
      language: cookieStore.get(LANG_COOKIE)?.value || "",
      device: detectDevice(userAgent),
      target_url: data.targetUrl,
      affiliate_click: data.affiliate ? "yes" : "no",
    };
    const { referrer, landingPage } = describeReferrer(headerList.get("referer"), data.origin || "");
    if (data.clickId) clickData.click_id = data.clickId;
    if (data.sessionId) clickData.session_id = data.sessionId;
    if (referrer) clickData.referrer = referrer;
    if (landingPage) clickData.landing_page = landingPage;
    if (data.networkId) clickData.network = data.networkId;
    if (data.serviceId) clickData.service = data.serviceId;
    if (data.offerId) clickData.offer = data.offerId;
    if (country && country !== "XX") clickData.country = country;
    if (sessionUser?.id) clickData.user = sessionUser.id;

    const created = await totalumSdk.crud.createRecord("clicks", clickData);
    if (created.errors) console.error("[go] click record errors:", created.errors);
    else if (data.clickId) console.log(`[go] click ${data.clickId} recorded`);
  } catch (err) {
    console.error("[go] click record failed:", err);
  }
}
