import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getServiceBySlug } from "@/lib/catalog";
import { getSessionUser } from "@/lib/admin-auth";
import { totalumSdk } from "@/lib/totalum";
import { resolveTargetUrl } from "@/lib/localize";
import { LANG_COOKIE } from "@/lib/i18n/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

function detectDevice(userAgent: string): "mobile" | "tablet" | "desktop" {
  const ua = userAgent.toLowerCase();
  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/.test(ua)) return "tablet";
  if (/mobi|iphone|ipod|android|blackberry|opera mini|iemobile/.test(ua)) return "mobile";
  return "desktop";
}

/**
 * Outbound affiliate redirect + real click tracking.
 * Every "Try it" button points here, so a click is recorded exactly once per visit.
 */
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const origin = new URL(request.url).origin;

  try {
    const service = await getServiceBySlug(slug);
    if (!service) {
      console.warn("[go] unknown service slug:", slug);
      return NextResponse.redirect(`${origin}/catalog`, 302);
    }

    const targetUrl = resolveTargetUrl(service);
    if (!targetUrl) {
      console.warn("[go] service has no target url:", slug);
      return NextResponse.redirect(`${origin}/ai/${slug}`, 302);
    }

    const headerList = await headers();
    const cookieStore = await cookies();
    const sessionUser = await getSessionUser();

    // Country only when the hosting platform provides a geo header — never guessed.
    const country =
      headerList.get("cf-ipcountry") ||
      headerList.get("x-vercel-ip-country") ||
      headerList.get("x-country-code") ||
      "";

    const clickData: Record<string, any> = {
      service: service._id,
      clicked_at: new Date().toISOString(),
      language: cookieStore.get(LANG_COOKIE)?.value || "",
      device: detectDevice(headerList.get("user-agent") || ""),
      target_url: targetUrl,
      affiliate_click: service.is_affiliate === "yes" && service.affiliate_url ? "yes" : "no",
    };
    if (country && country !== "XX") clickData.country = country;
    if (sessionUser?.id) clickData.user = sessionUser.id;

    const created = await totalumSdk.crud.createRecord("clicks", clickData);
    if (created.errors) console.error("[go] click record errors:", created.errors);
    console.log(`[go] click tracked for ${slug} → ${targetUrl} (affiliate: ${clickData.affiliate_click})`);

    return NextResponse.redirect(targetUrl, 302);
  } catch (err: any) {
    console.error("[go] failed to track click for", slug, err);
    // Tracking must never block the user: try to send them to the service page.
    return NextResponse.redirect(`${origin}/ai/${slug}`, 302);
  }
}
