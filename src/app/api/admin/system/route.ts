import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { readSettings } from "@/lib/telegram";
import { isPaymentsConfigured, paymentProvider } from "@/lib/billing";
import { listWebhookEvents } from "@/lib/webhook-events";
import { getNowPaymentsConfig } from "@/lib/payments/nowpayments";

export const dynamic = "force-dynamic";

/** Integration status for Webhooks / System Settings. Secrets are never returned. */
export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    const telegram = await readSettings();
    const nowPayments = await getNowPaymentsConfig();
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
    return NextResponse.json({
      ok: true,
      data: {
        appUrl: appUrl || null,
        payments: {
          provider: paymentProvider().name,
          status: await paymentProvider().configStatus(),
          configured: await isPaymentsConfigured(),
          // Only presence flags — values are never returned.
          apiKeySet: Boolean(nowPayments.apiKey),
          ipnSecretSet: Boolean(nowPayments.ipnSecret),
          sandbox: nowPayments.sandbox,
          ipnUrl: appUrl ? `${appUrl}/api/nowpayments/ipn` : null,
          events: ["waiting", "confirming", "confirmed", "sending", "partially_paid", "finished", "failed", "refunded", "expired"],
        },
        recentEvents: (await listWebhookEvents(20)).map((event) => ({
          _id: event._id,
          provider: event.provider,
          event_type: event.event_type,
          status: event.status,
          result: event.result,
          error: event.error,
          occurred_at: event.occurred_at,
          createdAt: event.createdAt,
        })),
        telegram: {
          configured: Boolean(telegram.token),
          username: telegram.username || null,
          webhookUrl: telegram.webhookUrl || null,
        },
      },
    });
  } catch (err: any) {
    console.error("[api/admin/system] error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
