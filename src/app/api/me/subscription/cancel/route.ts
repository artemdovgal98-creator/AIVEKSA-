import { NextResponse } from "next/server";
import { getCurrentDbUser } from "@/lib/admin-auth";
import { cancelOwnSubscription } from "@/lib/billing";
import { logAdminAction } from "@/lib/audit";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** Profile → CANCEL SUBSCRIPTION. Auto-renew off, access until end_date, no automatic refund. */
export async function POST(request: Request) {
  try {
    const user = await getCurrentDbUser();
    if (!user) return NextResponse.json({ ok: false, error: "Sign in required" }, { status: 401 });
    if (!rateLimit(`cancel-sub:${user._id}:${clientIp(request)}`, 5, 60_000)) {
      return NextResponse.json({ ok: false, error: "Too many requests" }, { status: 429 });
    }
    const result = await cancelOwnSubscription(user._id);
    // The action is logged in the same audit trail as admin changes (actor = the user).
    await logAdminAction(user._id, "subscription.self_cancel", "subscription", user._id, { access_until: result.endDate });
    return NextResponse.json({ ok: true, data: result });
  } catch (err: any) {
    const message = err?.message || "Unknown error";
    console.error("[api/me/subscription/cancel] error:", err);
    const status = message === "NO_ACTIVE_SUBSCRIPTION" ? 404 : message === "CANCEL_NOT_CONFIGURED" ? 503 : 500;
    return NextResponse.json({ ok: false, error: message, code: message }, { status });
  }
}
