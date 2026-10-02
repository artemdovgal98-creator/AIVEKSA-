import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { upsertSetting } from "@/lib/settings";
import { logAdminAction } from "@/lib/audit";
import { getCreditPacks } from "@/lib/credit-packs";
import { PADDLE_SETTING_KEYS, PRICE_ID_PATTERN, getPaddleConfig, invalidatePaddleConfig, paddleProvider } from "@/lib/payments/paddle";

export const dynamic = "force-dynamic";

const SECRET_FIELDS = ["clientToken", "webhookSecret", "apiKey"] as const;
type SecretField = (typeof SECRET_FIELDS)[number];

/** Payment provider settings. Secrets are write-only: only "set / not set" is ever returned. */
async function snapshot() {
  const config = await getPaddleConfig();
  const packs = await getCreditPacks();
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  return {
    provider: "paddle",
    status: await paddleProvider.configStatus(),
    enabled: config.enabled,
    environment: config.environment,
    clientTokenSet: Boolean(config.clientToken),
    webhookSecretSet: Boolean(config.webhookSecret),
    apiKeySet: Boolean(config.apiKey),
    proPriceId: config.planPrices.pro || "",
    packPrices: packs.map((pack) => ({ id: pack.id, credits: pack.credits, price: pack.price, currency: pack.currency, priceId: pack.paddle_price_id })),
    webhookUrl: appUrl ? `${appUrl}/api/paddle/webhook` : null,
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
 * PUT { enabled?, environment?, proPriceId?, clientToken?, webhookSecret?, apiKey?, clear?: ["apiKey", …] }
 * Empty secret fields mean "keep the stored value".
 */
export async function PUT(request: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const changed: string[] = [];

    if (typeof body.enabled === "boolean") {
      await upsertSetting(PADDLE_SETTING_KEYS.enabled, body.enabled ? "yes" : "no", "Paddle payments on/off");
      changed.push("enabled");
    }
    if (typeof body.environment === "string") {
      const value = body.environment === "sandbox" || body.environment === "production" ? body.environment : "";
      await upsertSetting(PADDLE_SETTING_KEYS.environment, value, "Paddle environment (empty = auto)");
      changed.push("environment");
    }
    if (typeof body.proPriceId === "string") {
      const value = body.proPriceId.trim();
      if (value && !PRICE_ID_PATTERN.test(value)) {
        return NextResponse.json({ ok: false, error: "AIVEXA PRO price ID must look like pri_…" }, { status: 400 });
      }
      await upsertSetting(PADDLE_SETTING_KEYS.proPriceId, value, "Paddle price ID for AIVEXA PRO");
      changed.push("proPriceId");
    }

    const validators: Record<SecretField, RegExp> = {
      clientToken: /^(live|test)_[A-Za-z0-9]{10,}$/,
      webhookSecret: /^\S{10,300}$/,
      apiKey: /^pdl_\S{10,300}$/,
    };
    const descriptions: Record<SecretField, string> = {
      clientToken: "Paddle client-side token",
      webhookSecret: "Paddle webhook secret (server-only)",
      apiKey: "Paddle API key (server-only)",
    };
    const clear = Array.isArray(body.clear) ? (body.clear as unknown[]).map(String) : [];
    for (const field of SECRET_FIELDS) {
      const raw = typeof body[field] === "string" ? (body[field] as string).trim() : "";
      if (clear.includes(field)) {
        await upsertSetting(PADDLE_SETTING_KEYS[field], "", descriptions[field]);
        changed.push(`${field}:cleared`);
        continue;
      }
      if (!raw) continue;
      if (!validators[field].test(raw)) {
        return NextResponse.json({ ok: false, error: `INVALID_${field}` }, { status: 400 });
      }
      await upsertSetting(PADDLE_SETTING_KEYS[field], raw, descriptions[field]);
      changed.push(field);
    }

    invalidatePaddleConfig();
    // Only the names of changed fields are logged — never the values.
    await logAdminAction(admin._id, "payments.settings.update", "admin_settings", "paddle", { changed });
    console.log("[api/admin/payments] updated:", changed.join(", ") || "nothing");
    return NextResponse.json({ ok: true, data: await snapshot() });
  } catch (err: any) {
    console.error("[api/admin/payments] PUT error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
