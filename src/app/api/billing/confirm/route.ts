import { NextResponse } from "next/server";
import { getCurrentDbUser } from "@/lib/admin-auth";
import { fulfilCheckoutSession, isPaymentsConfigured } from "@/lib/billing";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * POST { session_id } from the success page. Re-reads the session from Stripe
 * (never trusts the browser) — a fallback in case the webhook is delayed.
 */
export async function POST(request: Request) {
  try {
    if (!isPaymentsConfigured()) return NextResponse.json({ ok: false, error: "NOT_CONFIGURED" }, { status: 503 });
    const user = await getCurrentDbUser();
    if (!user) return NextResponse.json({ ok: false, error: "Sign in required" }, { status: 401 });
    if (!rateLimit(`confirm:${clientIp(request)}`, 20, 60_000)) {
      return NextResponse.json({ ok: false, error: "Too many requests" }, { status: 429 });
    }
    const body = (await request.json().catch(() => ({}))) as { session_id?: unknown };
    const sessionId = typeof body.session_id === "string" ? body.session_id : "";
    const outcome = await fulfilCheckoutSession(sessionId);
    return NextResponse.json({ ok: true, data: outcome });
  } catch (err: any) {
    console.error("[api/billing/confirm] error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
