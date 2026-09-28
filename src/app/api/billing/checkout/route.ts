import { NextResponse } from "next/server";
import { getCurrentDbUser } from "@/lib/admin-auth";
import { createPlanCheckout, isPaymentsConfigured } from "@/lib/billing";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * POST { plan: "pro" } → Stripe Checkout URL. Only the plan slug is accepted
 * from the browser; price, currency and duration come from the database.
 */
export async function POST(request: Request) {
  try {
    if (!isPaymentsConfigured()) {
      return NextResponse.json({ ok: false, error: "NOT_CONFIGURED", code: "NOT_CONFIGURED" }, { status: 503 });
    }
    const user = await getCurrentDbUser();
    if (!user) return NextResponse.json({ ok: false, error: "Sign in required", code: "AUTH_REQUIRED" }, { status: 401 });
    if (!rateLimit(`checkout:${user._id}:${clientIp(request)}`, 5, 60_000)) {
      return NextResponse.json({ ok: false, error: "Too many requests" }, { status: 429 });
    }

    const body = (await request.json().catch(() => ({}))) as { plan?: unknown };
    const slug = typeof body.plan === "string" ? body.plan.trim().toLowerCase() : "";
    if (!/^[a-z0-9-]{1,40}$/.test(slug)) return NextResponse.json({ ok: false, error: "Invalid plan" }, { status: 400 });

    const origin = (process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin).replace(/\/$/, "");
    const { url, orderId } = await createPlanCheckout(user, slug, origin);
    return NextResponse.json({ ok: true, data: { url, orderId } });
  } catch (err: any) {
    const message = err?.message || "Unknown error";
    console.error("[api/billing/checkout] error:", err);
    const status = message === "PLAN_NOT_AVAILABLE" ? 404 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
