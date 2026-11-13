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
 * NOWPayments adapter (https://documenter.getpostman.com/view/7907941/S1a32n38).
 *
 * - Checkout: the server creates a hosted invoice and the browser is
 *   redirected to `invoice_url` (crypto payment page). There is no
 *   client-side SDK and no price/product ids — the amount is sent directly.
 * - Fulfilment: only from the signed IPN callback (`x-nowpayments-sig`,
 *   HMAC-SHA512 over the JSON body with keys sorted alphabetically), or from
 *   a payment re-read through the NOWPayments API.
 *
 * Configuration is entered by the owner in Admin → System Settings →
 * Integrations (stored server-side in `admin_settings`, secrets are never
 * sent back to the browser). Env vars with the same names are an optional
 * fallback. Nothing is required: without them payments simply show NOT CONFIGURED.
 */

export const NOWPAYMENTS_SETTING_KEYS = {
  enabled: "nowpayments_enabled",
  apiKey: "nowpayments_api_key",
  ipnSecret: "nowpayments_ipn_secret",
  sandbox: "nowpayments_sandbox",
} as const;

export interface NowPaymentsConfig {
  enabled: boolean;
  apiKey: string;
  ipnSecret: string;
  sandbox: boolean;
}

const env = (key: string) => (process.env[key] || "").trim();

let cached: { at: number; config: NowPaymentsConfig } | null = null;
const CACHE_MS = 30_000;

export function invalidateNowPaymentsConfig() {
  cached = null;
}

/** Admin settings first, env fallback. Cached briefly so checkout never pays for it. */
export async function getNowPaymentsConfig(): Promise<NowPaymentsConfig> {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.config;
  const map = new Map<string, string>();
  const result = await totalumSdk.crud.query("admin_settings", {
    _filter: { setting_key: { in: Object.values(NOWPAYMENTS_SETTING_KEYS) } },
    _limit: 20,
  });
  if (result.errors) console.error("[nowpayments] settings read failed, using env only:", result.errors);
  for (const row of (result.data || []) as any[]) map.set(row.setting_key, String(row.setting_value ?? "").trim());

  const config: NowPaymentsConfig = {
    enabled: map.get(NOWPAYMENTS_SETTING_KEYS.enabled) !== "no",
    apiKey: map.get(NOWPAYMENTS_SETTING_KEYS.apiKey) || env("NOWPAYMENTS_API_KEY"),
    ipnSecret: map.get(NOWPAYMENTS_SETTING_KEYS.ipnSecret) || env("NOWPAYMENTS_IPN_SECRET"),
    sandbox: (map.get(NOWPAYMENTS_SETTING_KEYS.sandbox) || env("NOWPAYMENTS_SANDBOX")) === "yes",
  };
  cached = { at: Date.now(), config };
  return config;
}

const apiBase = (config: NowPaymentsConfig) => (config.sandbox ? "https://api-sandbox.nowpayments.io/v1" : "https://api.nowpayments.io/v1");

const toHex = (buffer: ArrayBuffer) => Array.from(new Uint8Array(buffer), (b) => b.toString(16).padStart(2, "0")).join("");

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** JSON.stringify with object keys sorted alphabetically at every level — the exact form NOWPayments signs. */
function sortedStringify(value: any): string {
  if (Array.isArray(value)) return `[${value.map(sortedStringify).join(",")}]`;
  if (value && typeof value === "object") {
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${sortedStringify(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

async function npApi<T = any>(config: NowPaymentsConfig, path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  if (!config.apiKey) throw new Error("NOWPAYMENTS_API_NOT_CONFIGURED");
  const response = await fetch(`${apiBase(config)}${path}`, {
    method: init?.method || "GET",
    headers: { "x-api-key": config.apiKey, "Content-Type": "application/json" },
    body: init?.body ? JSON.stringify(init.body) : undefined,
  });
  const json = (await response.json().catch(() => ({}))) as T & { message?: string };
  if (!response.ok) {
    console.error(`[nowpayments] ${init?.method || "GET"} ${path} failed: ${response.status} ${(json as any)?.message || ""}`);
    throw new Error(`NOWPAYMENTS_API_ERROR: ${(json as any)?.message || response.status}`);
  }
  return json;
}

const PAID_STATUSES = new Set(["finished"]);

/** Converts a raw NOWPayments payment object (API or IPN body) to the provider-neutral shape. */
export function normalizeNowPaymentsTransaction(raw: any): ProviderTransaction {
  return {
    id: String(raw?.payment_id || raw?.id || ""),
    status: String(raw?.payment_status || raw?.status || ""),
    paid: PAID_STATUSES.has(String(raw?.payment_status || raw?.status || "")),
    currency: String(raw?.price_currency || "").toLowerCase(),
    amount: Number(raw?.price_amount ?? NaN),
    customData: { order_id: String(raw?.order_id || "") },
    subscriptionId: null,
    origin: null,
    billingPeriodEndsAt: null,
  };
}

export const nowPaymentsProvider: PaymentProvider = {
  name: "nowpayments",

  async configStatus(): Promise<ProviderConfigStatus> {
    const config = await getNowPaymentsConfig();
    if (!config.enabled) return "DISABLED";
    if (!config.apiKey || !config.ipnSecret) return "NOT CONFIGURED";
    return "ENABLED";
  },

  async createCheckout(request: CheckoutRequest): Promise<CheckoutSession> {
    const config = await getNowPaymentsConfig();
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
    const invoice = await npApi<{ id: string; invoice_url: string }>(config, "/invoice", {
      method: "POST",
      body: {
        price_amount: request.amount,
        price_currency: request.currency.toLowerCase(),
        order_id: request.orderId,
        order_description: request.description.slice(0, 150),
        ipn_callback_url: `${appUrl}/api/nowpayments/ipn`,
        success_url: request.successUrl,
        cancel_url: request.cancelUrl,
      },
    });
    if (!invoice?.invoice_url) throw new Error("NOWPAYMENTS_INVOICE_FAILED");
    return { provider: "nowpayments", orderId: request.orderId, paymentUrl: invoice.invoice_url };
  },

  async getTransaction(transactionId: string): Promise<ProviderTransaction> {
    const config = await getNowPaymentsConfig();
    const raw = await npApi(config, `/payment/${encodeURIComponent(transactionId)}`);
    return normalizeNowPaymentsTransaction(raw);
  },

  async getPaymentStatus(transactionId: string): Promise<string> {
    return (await this.getTransaction(transactionId)).status;
  },

  async verifyWebhook(rawBody: string, headers: Headers): Promise<VerifiedWebhook | null> {
    const config = await getNowPaymentsConfig();
    const signature = headers.get("x-nowpayments-sig") || "";
    if (!config.ipnSecret || !signature) return null;

    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return null;
    }

    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(config.ipnSecret), { name: "HMAC", hash: "SHA-512" }, false, ["sign"]);
    const expected = toHex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(sortedStringify(body))));
    if (!safeEqual(signature.toLowerCase(), expected)) return null;

    return {
      eventId: String(body?.payment_id || ""),
      eventType: String(body?.payment_status || ""),
      occurredAt: new Date().toISOString(),
      data: body,
    };
  },

  async refundPayment(): Promise<{ id: string; status: string }> {
    // NOWPayments settles in crypto: there is no card-style refund API. Refunds are handled manually (admin → Orders).
    throw new Error("REFUND_NOT_SUPPORTED");
  },

  async cancelSubscription(): Promise<{ status: string; effectiveAt: string | null }> {
    // Crypto payments are one-time by nature — AIVEXA PRO never auto-renews on this provider.
    return { status: "cancelled", effectiveAt: null };
  },
};
