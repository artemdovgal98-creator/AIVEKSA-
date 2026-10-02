import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { totalumSdk } from "@/lib/totalum";
import { safeHttpUrl } from "@/lib/url-safety";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { logAdminAction } from "@/lib/audit";

export const dynamic = "force-dynamic";

/**
 * POST — link health check for one offer. Follows up to 5 redirects manually
 * (every hop re-validated) and records the result:
 *   reachable → TRACKING_UNKNOWN (we can see the link works, not whether the
 *               network attributes conversions — that needs a postback)
 *   4xx/5xx / network error → BROKEN
 * A broken offer is NEVER deleted automatically.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    if (!rateLimit(`offer-check:${clientIp(request)}`, 30, 60_000)) {
      return NextResponse.json({ ok: false, error: "Too many checks, wait a minute" }, { status: 429 });
    }

    const { id } = await params;
    if (!/^[a-f0-9]{24}$/i.test(id)) return NextResponse.json({ ok: false, error: "Invalid id" }, { status: 400 });
    const current = await totalumSdk.crud.getRecordById("affiliate_offers", id);
    const offer = current.data as any;
    if (!offer) return NextResponse.json({ ok: false, error: "Offer not found" }, { status: 404 });

    let url = safeHttpUrl(offer.affiliate_url);
    let status: "tracking_unknown" | "broken" | "needs_review" = "needs_review";
    let note = "";
    if (!url) {
      note = "No valid affiliate URL";
    } else {
      try {
        let hops = 0;
        let httpStatus = 0;
        while (url && hops < 6) {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 8000);
          const response = await fetch(url, {
            method: "GET",
            redirect: "manual",
            signal: controller.signal,
            headers: { "user-agent": "Mozilla/5.0 (AIVEXA link health check)" },
          });
          clearTimeout(timer);
          httpStatus = response.status;
          if (httpStatus >= 300 && httpStatus < 400 && response.headers.get("location")) {
            url = safeHttpUrl(new URL(response.headers.get("location")!, url).toString());
            hops++;
            continue;
          }
          break;
        }
        if (httpStatus >= 200 && httpStatus < 400) {
          status = "tracking_unknown";
          note = `HTTP ${httpStatus} after ${hops} redirect(s)`;
        } else if (httpStatus === 403 || httpStatus === 429) {
          // Anti-bot pages are common on tracking domains — a human must look.
          status = "needs_review";
          note = `HTTP ${httpStatus} (blocked automated check)`;
        } else {
          status = "broken";
          note = `HTTP ${httpStatus}`;
        }
      } catch (err: any) {
        status = "broken";
        note = `Network error: ${String(err?.name === "AbortError" ? "timeout" : err?.message || err).slice(0, 120)}`;
      }
    }

    // Manually confirmed tracking (TRACKING_OK) is not downgraded by a reachable check.
    const nextStatus = status === "tracking_unknown" && offer.status === "tracking_ok" ? "tracking_ok" : status;
    const patch = { status: nextStatus, last_checked_at: new Date().toISOString(), health_note: note };
    const updated = await totalumSdk.crud.editRecordById("affiliate_offers", id, patch);
    if (updated.errors) {
      console.error("[api/admin/offers/check] update errors:", updated.errors);
      return NextResponse.json({ ok: false, error: "Failed to save health status" }, { status: 500 });
    }
    await logAdminAction(admin._id, "offer.health_check", "affiliate_offers", id, patch);
    console.log(`[api/admin/offers/check] ${id} → ${nextStatus} (${note})`);
    return NextResponse.json({ ok: true, data: patch });
  } catch (err: any) {
    console.error("[api/admin/offers/check] error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
