import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { upsertSetting } from "@/lib/settings";
import { logAdminAction } from "@/lib/audit";
import { getCreditPacks } from "@/lib/credit-packs";
import { listWebhookEvents } from "@/lib/webhook-events";
import { NOWPAYMENTS_SETTING_KEYS, getNowPaymentsConfig, invalidateNowPaymentsConfig, nowPaymentsProvider } from "@/lib/payments/nowpayments";

export const dynamic = "force-dynamic";

const SECRET_FIELDS = ["apiKey", "ipnSecret"] as const;
type SecretField = (typeof SECRET_FIELDS)[number];

const SECRET_KEY_MAP: Record<SecretField, string> = {
  apiKey: NOWPAYMENTS_SETTING_KEYS.apiKey,
  ipnSecret: NOWPAYMENTS_SETTING_KEYS.ipnSecret,
};

/** Payment provider settings. Secrets are write-only: only "set / not set" is ever returned. */
async function snapshot() {
  const config = await getNowPaymentsConfig();
  const packs = await getCreditPacks();
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  const events = await listWebhookEvents(10, 0, "nowpayments").catch(() => []);
  return {
    provider: "nowpayments",
    status: await nowPaymentsProvider.configStatus(),
    enabled: config.enabled,
    sandbox: config.sandbox,
    apiKeySet: Boolean(config.apiKey),
    ipnSecretSet: Boolean(config.ipnSecret),
    packPrices: packs.map((pack) => ({ id: pack.id, credits: pack.credits, price: pack.price, currency: pack.currency })),
    ipnUrl: appUrl ? `${appUrl}/api/nowpayments/ipn` : null,
    recentEvents: events.map((event) => ({
      _id: event._id,
      event_type: event.event_type,
      status: event.status,
      result: event.result,
      error: event.error,
      occurred_at: event.occurred_at,
      createdAt: event.createdAt,
    })),
  };
}

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    return NextResponse.json({ ok: true, data: await snapshot() });
  } catch (err: any) {
    console.error("[api/admin/payments] GET error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}

/**
 * PUT { enabled?, sandbox?, apiKey?, ipnSecret?, clear?: ["apiKey", …] }
 * Empty secret fields mean "keep the stored value".
 */
export async function PUT(request: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const changed: string[] = [];

    if (typeof body.enabled === "boolean") {
      await upsertSetting(NOWPAYMENTS_SETTING_KEYS.enabled, body.enabled ? "yes" : "no", "NOWPayments on/off");
      changed.push("enabled");
    }
    if (typeof body.sandbox === "boolean") {
      await upsertSetting(NOWPAYMENTS_SETTING_KEYS.sandbox, body.sandbox ? "yes" : "no", "NOWPayments sandbox mode");
      changed.push("sandbox");
    }

    const descriptions: Record<SecretField, string> = {
      apiKey: "NOWPayments API key (server-only)",
      ipnSecret: "NOWPayments IPN secret key (server-only)",
    };
    const clear = Array.isArray(body.clear) ? (body.clear as unknown[]).map(String) : [];
    for (const field of SECRET_FIELDS) {
      const raw = typeof body[field] === "string" ? (body[field] as string).trim() : "";
      if (clear.includes(field)) {
        await upsertSetting(SECRET_KEY_MAP[field], "", descriptions[field]);
        changed.push(`${field}:cleared`);
        continue;
      }
      if (!raw) continue;
      if (raw.length < 8) {
        return NextResponse.json({ ok: false, error: `INVALID_${field}` }, { status: 400 });
      }
      await upsertSetting(SECRET_KEY_MAP[field], raw, descriptions[field]);
      changed.push(field);
    }

    invalidateNowPaymentsConfig();
    // Only the names of changed fields are logged — never the values.
    await logAdminAction(admin._id, "payments.settings.update", "admin_settings", "nowpayments", { changed });
    console.log("[api/admin/payments] updated:", changed.join(", ") || "nothing");
    return NextResponse.json({ ok: true, data: await snapshot() });
  } catch (err: any) {
    console.error("[api/admin/payments] PUT error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}

/** POST { action: "test" } — creates a $1 invoice with the stored credentials so the admin can verify the setup end-to-end. */
export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    const body = (await request.json().catch(() => ({}))) as { action?: unknown };
    if (body.action !== "test") return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin).replace(/\/$/, "");
    const checkout = await nowPaymentsProvider.createCheckout({
      orderId: `test_${Date.now()}`,
      userId: admin._id,
      amount: 1,
      currency: "usd",
      description: "AIVEXA — test payment",
      successUrl: `${appUrl}/admin/settings`,
      cancelUrl: `${appUrl}/admin/settings`,
    });
    console.log("[api/admin/payments] test invoice created:", checkout.orderId);
    return NextResponse.json({ ok: true, data: { paymentUrl: checkout.paymentUrl } });
  } catch (err: any) {
    console.error("[api/admin/payments] test payment error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
