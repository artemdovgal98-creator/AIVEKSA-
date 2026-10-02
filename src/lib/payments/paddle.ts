import "server-only";
import { totalumSdk } from "@/lib/totalum";
import type {
  CheckoutRequest,
  CheckoutSession,
  PaymentProvider,
  ProviderConfigStatus,
  ProviderTransaction,
  VerifiedWebhook,
} from "@/lib/payments/provider";

/**
 * Paddle Billing adapter (https://developer.paddle.com).
 *
 * - Checkout: Paddle.js overlay opened in the browser with a server-chosen
 *   price id and server-written custom data (order id, user id).
 * - Fulfilment: only from signed webhooks (`Paddle-Signature`, HMAC-SHA256),
 *   or from a transaction re-read through the Paddle API.
 *
 * Configuration is entered by the owner in Admin → System Settings → Payments
 * (stored server-side in `admin_settings`, secrets are never sent back to the
 * browser). Env vars with the same names are an optional fallback:
 *   PADDLE_CLIENT_TOKEN   — client-side token (live_… / test_…), public by design
 *   PADDLE_WEBHOOK_SECRET — notification destination secret key
 *   PADDLE_API_KEY        — API key, needed for cancel / refund / instant confirm
 * Nothing is required: without them payments simply show NOT CONFIGURED.
 */

/** Catalog in Paddle (product pro_01m3mvbbmpznq55dpqza901y24). Ids are public identifiers, not secrets. */
export const PADDLE_PRODUCT_ID = "pro_01m3mvbbmpznq55dpqza901y24";

export const PADDLE_PLAN_PRICES: Record<string, string> = {
  // AIVEXA PRO — $9.99 / month subscription
  pro: "pri_01m3mwre7g86an8np11bmx1pby",
};

export const PADDLE_PACK_PRICES: Record<string, string> = {
  starter: "pri_01m3mwsmmm9jw349c7xvs65r2t", // 50 AI credits — $4.99
  creator: "pri_01m3mwtppwp8vdddp4p4z0a3pq", // 150 AI credits — $12.99
  studio: "pri_01m3mwvxb5p0362wpac43ewrf7", // 400 AI credits — $29.99
};

export const PRICE_ID_PATTERN = /^pri_[a-z0-9]{20,40}$/;

export const PADDLE_SETTING_KEYS = {
  enabled: "paddle_enabled",
  clientToken: "paddle_client_token",
  webhookSecret: "paddle_webhook_secret",
  apiKey: "paddle_api_key",
  environment: "paddle_environment",
  proPriceId: "paddle_price_pro",
} as const;

export interface PaddleConfig {
  enabled: boolean;
  clientToken: string;
  webhookSecret: string;
  apiKey: string;
  environment: "sandbox" | "production";
  planPrices: Record<string, string>;
}

const env = (key: string) => (process.env[key] || "").trim();

let cached: { at: number; config: PaddleConfig } | null = null;
const CACHE_MS = 30_000;

export function invalidatePaddleConfig() {
  cached = null;
}

/** Admin settings first, env fallback. Cached briefly so the catalog never pays for it. */
export async function getPaddleConfig(): Promise<PaddleConfig> {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.config;
  const map = new Map<string, string>();
  const result = await totalumSdk.crud.query("admin_settings", {
    _filter: { setting_key: { in: Object.values(PADDLE_SETTING_KEYS) } },
    _limit: 20,
  });
  if (result.errors) console.error("[paddle] settings read failed, using env only:", result.errors);
  for (const row of (result.data || []) as any[]) map.set(row.setting_key, String(row.setting_value ?? "").trim());

  const clientToken = map.get(PADDLE_SETTING_KEYS.clientToken) || env("PADDLE_CLIENT_TOKEN");
  const apiKey = map.get(PADDLE_SETTING_KEYS.apiKey) || env("PADDLE_API_KEY");
  const forced = (map.get(PADDLE_SETTING_KEYS.environment) || env("PADDLE_ENVIRONMENT")).toLowerCase();
  const environment: "sandbox" | "production" =
    forced === "sandbox" || forced === "production"
      ? forced
      : clientToken.startsWith("test_") || apiKey.includes("_sdbx_")
        ? "sandbox"
        : "production";
  const proPrice = map.get(PADDLE_SETTING_KEYS.proPriceId) || "";

  const config: PaddleConfig = {
    enabled: map.get(PADDLE_SETTING_KEYS.enabled) !== "no",
    clientToken,
    webhookSecret: map.get(PADDLE_SETTING_KEYS.webhookSecret) || env("PADDLE_WEBHOOK_SECRET"),
    apiKey,
    environment,
    planPrices: { ...PADDLE_PLAN_PRICES, ...(PRICE_ID_PATTERN.test(proPrice) ? { pro: proPrice } : {}) },
  };
  cached = { at: Date.now(), config };
  return config;
}

const apiBase = (config: PaddleConfig) => (config.environment === "sandbox" ? "https://sandbox-api.paddle.com" : "https://api.paddle.com");

const toHex = (buffer: ArrayBuffer) => Array.from(new Uint8Array(buffer), (b) => b.toString(16).padStart(2, "0")).join("");

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

const WEBHOOK_TOLERANCE_SECONDS = 300;

export async function paddleApiConfigured(): Promise<boolean> {
  return (await getPaddleConfig()).apiKey.length > 0;
}

async function paddleApi<T = any>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const config = await getPaddleConfig();
  const key = config.apiKey;
  if (!key) throw new Error("PADDLE_API_NOT_CONFIGURED");
  const response = await fetch(`${apiBase(config)}${path}`, {
    method: init?.method || "GET",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: init?.body ? JSON.stringify(init.body) : undefined,
  });
  const json = (await response.json().catch(() => ({}))) as { data?: T; error?: { code?: string; detail?: string } };
  if (!response.ok) {
    console.error(`[paddle] ${init?.method || "GET"} ${path} failed: ${response.status} ${json.error?.code || ""}`);
    throw new Error(`PADDLE_API_ERROR: ${json.error?.code || response.status} ${json.error?.detail || ""}`.trim());
  }
  return json.data as T;
}

/** Converts a raw Paddle transaction (API or webhook `data`) to the provider-neutral shape. */
export function normalizePaddleTransaction(raw: any): ProviderTransaction {
  const customData: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw?.custom_data || {})) customData[key] = String(value ?? "");
  return {
    id: String(raw?.id || ""),
    status: String(raw?.status || ""),
    paid: raw?.status === "completed" || raw?.status === "paid",
    currency: String(raw?.currency_code || "").toLowerCase(),
    items: ((raw?.items || []) as any[]).map((item) => ({
      priceId: String(item?.price?.id || item?.price_id || ""),
      unitAmountMinor: Number(item?.price?.unit_price?.amount ?? NaN),
      quantity: Number(item?.quantity || 1),
    })),
    customData,
    subscriptionId: raw?.subscription_id ? String(raw.subscription_id) : null,
    origin: raw?.origin ? String(raw.origin) : null,
    billingPeriodEndsAt: raw?.billing_period?.ends_at ? String(raw.billing_period.ends_at) : null,
  };
}

export const paddleProvider: PaymentProvider = {
  name: "paddle",

  async configStatus(): Promise<ProviderConfigStatus> {
    const config = await getPaddleConfig();
    const token = config.clientToken;
    const secret = config.webhookSecret;
    const apiKey = config.apiKey;
    if (!config.enabled) return "DISABLED";
    if (!token || !secret) return "NOT CONFIGURED";
    if (!/^(live|test)_[A-Za-z0-9]+$/.test(token)) return "INVALID CONFIGURATION";
    if (apiKey && !apiKey.startsWith("pdl_")) return "INVALID CONFIGURATION";
    return "ENABLED";
  },

  async createCheckout(request: CheckoutRequest): Promise<CheckoutSession> {
    if (!PRICE_ID_PATTERN.test(request.priceId)) throw new Error("PRICE_NOT_CONFIGURED");
    const config = await getPaddleConfig();
    return {
      provider: "paddle",
      orderId: request.orderId,
      priceId: request.priceId,
      clientToken: config.clientToken,
      environment: config.environment,
      customData: { order_id: request.orderId, user_id: request.userId },
      email: request.email,
      successUrl: request.successUrl,
    };
  },

  async getTransaction(transactionId: string): Promise<ProviderTransaction> {
    if (!/^txn_[a-z0-9]+$/.test(transactionId)) throw new Error("INVALID_TRANSACTION_ID");
    const raw = await paddleApi(`/transactions/${transactionId}`);
    return normalizePaddleTransaction(raw);
  },

  async getPaymentStatus(transactionId: string): Promise<string> {
    return (await this.getTransaction(transactionId)).status;
  },

  async verifyWebhook(rawBody: string, headers: Headers): Promise<VerifiedWebhook | null> {
    const secret = (await getPaddleConfig()).webhookSecret;
    const header = headers.get("paddle-signature") || "";
    if (!secret || !header) return null;

    const parts = new Map<string, string[]>();
    for (const piece of header.split(";")) {
      const [k, v] = piece.split("=");
      if (!k || !v) continue;
      parts.set(k.trim(), [...(parts.get(k.trim()) || []), v.trim()]);
    }
    const ts = parts.get("ts")?.[0] || "";
    const signatures = parts.get("h1") || [];
    if (!/^\d+$/.test(ts) || signatures.length === 0) return null;
    if (Math.abs(Date.now() / 1000 - Number(ts)) > WEBHOOK_TOLERANCE_SECONDS) {
      console.warn("[paddle] webhook timestamp outside tolerance");
      return null;
    }

    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const expected = toHex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${ts}:${rawBody}`)));
    if (!signatures.some((signature) => safeEqual(signature, expected))) return null;

    const event = JSON.parse(rawBody);
    return {
      eventId: String(event?.event_id || ""),
      eventType: String(event?.event_type || ""),
      occurredAt: String(event?.occurred_at || new Date().toISOString()),
      data: event?.data || {},
    };
  },

  async refundPayment(transactionId: string, reason: string) {
    const adjustment = await paddleApi<{ id: string; status: string }>("/adjustments", {
      method: "POST",
      body: { action: "refund", transaction_id: transactionId, reason: reason.slice(0, 200) || "Refund", type: "full" },
    });
    // Paddle reviews refunds: the order becomes REFUNDED only when `adjustment.updated` reports `approved`.
    return { id: String(adjustment?.id || ""), status: String(adjustment?.status || "pending_approval") };
  },

  async cancelSubscription(subscriptionId: string) {
    if (!/^sub_[a-z0-9]+$/.test(subscriptionId)) throw new Error("INVALID_SUBSCRIPTION_ID");
    const subscription = await paddleApi<any>(`/subscriptions/${subscriptionId}/cancel`, {
      method: "POST",
      body: { effective_from: "next_billing_period" },
    });
    return {
      status: String(subscription?.status || ""),
      effectiveAt: subscription?.scheduled_change?.effective_at || subscription?.current_billing_period?.ends_at || null,
    };
  },
};
