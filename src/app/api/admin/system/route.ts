import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { readSettings } from "@/lib/telegram";
import { isPaymentsConfigured } from "@/lib/billing";

export const dynamic = "force-dynamic";

/** Integration status for Webhooks / System Settings. Secrets are never returned. */
export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    const telegram = await readSettings();
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
    return NextResponse.json({
      ok: true,
      data: {
        appUrl: appUrl || null,
        stripe: {
          configured: isPaymentsConfigured(),
          webhookSecret: Boolean((process.env.STRIPE_WEBHOOK_SECRET || "").trim()),
          webhookUrl: appUrl ? `${appUrl}/api/stripe/webhook` : null,
          events: ["checkout.session.completed", "checkout.session.async_payment_succeeded", "checkout.session.async_payment_failed", "checkout.session.expired"],
        },
        telegram: {
          configured: Boolean(telegram.token),
          username: telegram.username || null,
          webhookUrl: telegram.webhookUrl || null,
        },
        zernio: { configured: Boolean((process.env.ZERNIO_API_KEY || "").trim()) },
      },
    });
  } catch (err: any) {
    console.error("[api/admin/system] error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
