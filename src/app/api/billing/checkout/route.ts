import { NextResponse } from "next/server";
import { getCurrentDbUser } from "@/lib/admin-auth";
import { createCreditsCheckout, createPlanCheckout, isPaymentsConfigured } from "@/lib/billing";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * POST { plan: "pro" } or { pack: "starter" } → pending order + Paddle checkout
 * data (server-chosen price id). Only the slug / pack id is accepted from the
 * browser; prices and price ids come from the server.
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

    const body = (await request.json().catch(() => ({}))) as { plan?: unknown; pack?: unknown };
    const pack = typeof body.pack === "string" ? body.pack.trim().toLowerCase() : "";
    const slug = typeof body.plan === "string" ? body.plan.trim().toLowerCase() : "";
    const target = pack || slug;
    if (!/^[a-z0-9-]{1,40}$/.test(target)) return NextResponse.json({ ok: false, error: "Invalid plan" }, { status: 400 });

    const origin = (process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin).replace(/\/$/, "");
    const checkout = pack ? await createCreditsCheckout(user, pack, origin) : await createPlanCheckout(user, slug, origin);
    return NextResponse.json({ ok: true, data: checkout });
  } catch (err: any) {
    const message = err?.message || "Unknown error";
    console.error("[api/billing/checkout] error:", err);
    const status = message === "PLAN_NOT_AVAILABLE" || message === "PACK_NOT_AVAILABLE" ? 404 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
