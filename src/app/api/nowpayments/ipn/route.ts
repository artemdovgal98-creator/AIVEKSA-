import { NextResponse } from "next/server";
import { applyRefund, fulfilTransaction } from "@/lib/billing";
import { normalizeNowPaymentsTransaction, nowPaymentsProvider } from "@/lib/payments/nowpayments";
import { findProcessedEvent, recordWebhookEvent } from "@/lib/webhook-events";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * NOWPayments IPN callback. Only a request with a valid `x-nowpayments-sig`
 * (HMAC-SHA512 over the JSON body, keys sorted) can ever change an order.
 * Credits/subscriptions are granted only on `finished`, and only once per
 * `payment_id` (idempotency via `webhook_events`).
 */
export async function POST(request: Request) {
  const rawBody = await request.text();

  const event = await nowPaymentsProvider.verifyWebhook(rawBody, request.headers);
  if (!event) {
    if (!rateLimit(`nowpayments-invalid:${clientIp(request)}`, 20, 60_000)) {
      return NextResponse.json({ ok: false, error: "Too many requests" }, { status: 429 });
    }
    console.error("[api/nowpayments/ipn] invalid signature");
    await recordWebhookEvent({ provider: "nowpayments", eventId: "", eventType: "invalid", status: "invalid_signature", error: "signature mismatch" }).catch(() => {});
    return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 401 });
  }

  try {
    if (await findProcessedEvent("nowpayments", event.eventId)) {
      return NextResponse.json({ ok: true, data: { duplicate: true } });
    }

    const orderId = String(event.data?.order_id || "");
    const status = event.eventType; // NOWPayments payment_status

    let outcome: { status: string; result?: string; error?: string } = { status: "ignored" };
    if (status === "finished") {
      const tx = normalizeNowPaymentsTransaction(event.data);
      const result = await fulfilTransaction(tx);
      outcome = { status: result.status === "paid" ? "processed" : "failed", result: JSON.stringify(result) };
    } else if (status === "refunded") {
      const result = await applyRefund(String(event.data?.payment_id || ""));
      outcome = { status: "processed", result: JSON.stringify(result) };
    } else {
      // waiting / confirming / confirmed / sending / partially_paid / failed / expired — logged only.
      outcome = { status: "ignored", result: `payment_status=${status}` };
    }

    await recordWebhookEvent({
      provider: "nowpayments",
      eventId: event.eventId,
      eventType: event.eventType,
      status: outcome.status as any,
      result: outcome.result,
      error: outcome.error,
      referenceId: orderId,
      orderId,
      occurredAt: event.occurredAt,
    });
    console.log(`[api/nowpayments/ipn] payment ${event.eventId} (${status}) → ${outcome.status}`);
    return NextResponse.json({ ok: true, data: outcome });
  } catch (err: any) {
    console.error("[api/nowpayments/ipn] processing error:", err);
    await recordWebhookEvent({
      provider: "nowpayments",
      eventId: event.eventId,
      eventType: event.eventType,
      status: "failed",
      error: err?.message || "Unknown error",
    }).catch(() => {});
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
