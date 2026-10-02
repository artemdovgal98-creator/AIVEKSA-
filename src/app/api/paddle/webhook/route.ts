import { NextResponse } from "next/server";
import { applyProviderCancellation, applyRefund, fulfilTransaction, type FulfilOutcome } from "@/lib/billing";
import { normalizePaddleTransaction, paddleProvider } from "@/lib/payments/paddle";
import { findProcessedEvent, recordWebhookEvent } from "@/lib/webhook-events";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Paddle notification destination: https://<domain>/api/paddle/webhook
 * Events: transaction.completed, transaction.paid, transaction.canceled,
 * transaction.payment_failed, subscription.canceled, adjustment.created, adjustment.updated.
 *
 * Signature (Paddle-Signature) is verified before anything is read; each
 * event id is processed once; failures return 500 so Paddle retries.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const event = await paddleProvider.verifyWebhook(rawBody, request.headers).catch((err) => {
    console.error("[paddle-webhook] verification error:", err);
    return null;
  });

  if (!event) {
    console.warn("[paddle-webhook] rejected: invalid or missing signature");
    if (rateLimit(`paddle-invalid:${clientIp(request)}`, 5, 60_000)) {
      await recordWebhookEvent({ provider: "paddle", eventId: "", eventType: "unknown", status: "invalid_signature", result: "rejected" });
    }
    return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 401 });
  }

  try {
    if (await findProcessedEvent("paddle", event.eventId)) {
      console.log(`[paddle-webhook] duplicate ${event.eventId} (${event.eventType}) ignored`);
      return NextResponse.json({ ok: true, data: { duplicate: true } });
    }

    let outcome: FulfilOutcome = { status: "ignored" };
    let referenceId = String(event.data?.id || "");
    switch (event.eventType) {
      case "transaction.completed":
      case "transaction.paid":
      case "transaction.canceled":
        outcome = await fulfilTransaction(normalizePaddleTransaction(event.data));
        break;
      case "transaction.payment_failed":
        // Paddle lets the customer retry inside the same checkout — the order stays pending.
        outcome = { status: "pending", orderId: event.data?.custom_data?.order_id, detail: "payment attempt failed" };
        break;
      case "subscription.canceled":
        outcome = await applyProviderCancellation(String(event.data?.id || ""), event.data?.canceled_at || null);
        break;
      case "adjustment.created":
      case "adjustment.updated":
        referenceId = String(event.data?.transaction_id || referenceId);
        if (event.data?.action === "refund" && event.data?.status === "approved") {
          outcome = await applyRefund(String(event.data.transaction_id || ""));
        } else {
          outcome = { status: "ignored", detail: `${event.data?.action || "adjustment"} ${event.data?.status || ""}`.trim() };
        }
        break;
      default:
        outcome = { status: "ignored", detail: "event not used" };
    }

    const handled = outcome.status !== "ignored" && outcome.status !== "unknown_order";
    await recordWebhookEvent({
      provider: "paddle",
      eventId: event.eventId,
      eventType: event.eventType,
      status: handled ? "processed" : "ignored",
      result: [outcome.status, outcome.kind, outcome.detail].filter(Boolean).join(" · "),
      referenceId,
      orderId: outcome.orderId,
      occurredAt: event.occurredAt,
    });
    console.log(`[paddle-webhook] ${event.eventType} ${event.eventId} →`, outcome);
    return NextResponse.json({ ok: true, data: { status: outcome.status } });
  } catch (err: any) {
    console.error(`[paddle-webhook] ${event.eventType} ${event.eventId} failed:`, err);
    await recordWebhookEvent({
      provider: "paddle",
      eventId: event.eventId,
      eventType: event.eventType,
      status: "failed",
      error: err?.message || String(err),
      referenceId: String(event.data?.id || ""),
      occurredAt: event.occurredAt,
    });
    return NextResponse.json({ ok: false, error: "Processing failed" }, { status: 500 });
  }
}
