import "server-only";
import { totalumSdk } from "@/lib/totalum";

/**
 * Log of REAL incoming webhook events (shown in Admin → Webhooks). Also the
 * idempotency guard: an event id that was already processed is never handled twice.
 */

export type WebhookEventStatus = "received" | "processed" | "ignored" | "failed" | "invalid_signature";

export interface WebhookEventRecord {
  _id: string;
  event_id?: string;
  provider?: string;
  event_type?: string;
  status?: WebhookEventStatus;
  result?: string;
  error?: string;
  reference_id?: string;
  occurred_at?: string;
  createdAt?: string;
}

/** Returns the existing record when this event was already processed. */
export async function findProcessedEvent(provider: string, eventId: string): Promise<WebhookEventRecord | null> {
  if (!eventId) return null;
  const result = await totalumSdk.crud.query("webhook_events", {
    _filter: { provider, event_id: eventId, status: { in: ["processed", "ignored"] } },
    _limit: 1,
  });
  if (result.errors) {
    console.error("[webhook-events] lookup failed:", result.errors);
    throw new Error("Webhook event lookup failed");
  }
  return ((result.data || []) as unknown as WebhookEventRecord[])[0] || null;
}

export async function recordWebhookEvent(event: {
  provider: string;
  eventId: string;
  eventType: string;
  status: WebhookEventStatus;
  result?: string;
  error?: string;
  referenceId?: string;
  orderId?: string;
  occurredAt?: string;
}): Promise<void> {
  const created = await totalumSdk.crud.createRecord("webhook_events", {
    provider: event.provider,
    event_id: event.eventId || "",
    event_type: event.eventType || "",
    status: event.status,
    result: (event.result || "").slice(0, 300),
    error: (event.error || "").slice(0, 2000),
    reference_id: event.referenceId || "",
    occurred_at: event.occurredAt || new Date().toISOString(),
    ...(event.orderId && /^[a-f0-9]{24}$/.test(event.orderId) ? { order: event.orderId } : {}),
  });
  // Logging must never break webhook processing, but a failure has to be visible.
  if (created.errors) console.error("[webhook-events] failed to record event:", created.errors);
}

export async function listWebhookEvents(limit = 50, offset = 0): Promise<WebhookEventRecord[]> {
  const result = await totalumSdk.crud.query("webhook_events", {
    _sort: { createdAt: "desc" },
    _limit: Math.min(Math.max(limit, 1), 100),
    _offset: Math.max(offset, 0),
  });
  if (result.errors) {
    console.error("[webhook-events] list failed:", result.errors);
    throw new Error("Webhook events query failed");
  }
  return (result.data || []) as unknown as WebhookEventRecord[];
}
