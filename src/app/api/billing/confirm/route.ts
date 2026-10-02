import { NextResponse } from "next/server";
import { getCurrentDbUser } from "@/lib/admin-auth";
import { getOwnOrderStatus, isPaymentsConfigured } from "@/lib/billing";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * POST { order_id, transaction_id? } from the success page. Returns the order
 * status for the signed-in owner only. Nothing is activated from the browser:
 * fulfilment happens from the signed webhook, or from the transaction re-read
 * through the Paddle API when PADDLE_API_KEY is set.
 */
export async function POST(request: Request) {
  try {
    if (!isPaymentsConfigured()) return NextResponse.json({ ok: false, error: "NOT_CONFIGURED" }, { status: 503 });
    const user = await getCurrentDbUser();
    if (!user) return NextResponse.json({ ok: false, error: "Sign in required" }, { status: 401 });
    if (!rateLimit(`confirm:${user._id}:${clientIp(request)}`, 30, 60_000)) {
      return NextResponse.json({ ok: false, error: "Too many requests" }, { status: 429 });
    }
    const body = (await request.json().catch(() => ({}))) as { order_id?: unknown; transaction_id?: unknown };
    const orderId = typeof body.order_id === "string" ? body.order_id.trim() : "";
    const transactionId = typeof body.transaction_id === "string" ? body.transaction_id.trim() : "";
    if (!/^[a-f0-9]{24}$/.test(orderId)) return NextResponse.json({ ok: false, error: "Invalid order" }, { status: 400 });
    const outcome = await getOwnOrderStatus(user._id, orderId, /^txn_[a-z0-9]+$/.test(transactionId) ? transactionId : undefined);
    console.log(`[api/billing/confirm] order ${orderId} → ${outcome.status}`);
    return NextResponse.json({ ok: true, data: outcome });
  } catch (err: any) {
    console.error("[api/billing/confirm] error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
