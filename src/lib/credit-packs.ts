import "server-only";
import { readSetting } from "@/lib/settings";
import type { Currency } from "@/lib/types";
import { PADDLE_PACK_PRICES, PRICE_ID_PATTERN } from "@/lib/payments/paddle";

/**
 * One-time AIVEXA CREDITS packs. Stored as JSON in admin_settings
 * (`credit_packs`) and editable in Admin → Credit System. Prices always come
 * from here — the browser only sends the pack id.
 */
export interface CreditPack {
  id: string;
  credits: number;
  price: number;
  currency: Currency;
  active: boolean;
  /** Paddle price (pri_…) charged for this pack. Packs without one cannot be bought. */
  paddle_price_id: string;
}

export const CREDIT_PACKS_KEY = "credit_packs";

export const DEFAULT_CREDIT_PACKS: CreditPack[] = [
  { id: "starter", credits: 50, price: 4.99, currency: "usd", active: true, paddle_price_id: PADDLE_PACK_PRICES.starter },
  { id: "creator", credits: 150, price: 12.99, currency: "usd", active: true, paddle_price_id: PADDLE_PACK_PRICES.creator },
  { id: "studio", credits: 400, price: 29.99, currency: "usd", active: true, paddle_price_id: PADDLE_PACK_PRICES.studio },
];

const CURRENCIES = ["usd", "eur"];

/** Drops anything malformed; ids must be unique slugs. */
export function normalizePacks(input: unknown): CreditPack[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const packs: CreditPack[] = [];
  for (const raw of input.slice(0, 12) as any[]) {
    const id = String(raw?.id || "").trim().toLowerCase();
    const credits = Math.trunc(Number(raw?.credits));
    const price = Math.round(Number(raw?.price) * 100) / 100;
    const currency = String(raw?.currency || "usd").toLowerCase();
    if (!/^[a-z0-9-]{1,30}$/.test(id) || seen.has(id)) continue;
    if (!Number.isFinite(credits) || credits < 1 || credits > 100_000) continue;
    if (!Number.isFinite(price) || price < 0.5 || price > 10_000) continue;
    const priceId = String(raw?.paddle_price_id || "").trim();
    seen.add(id);
    packs.push({
      id,
      credits,
      price,
      currency: (CURRENCIES.includes(currency) ? currency : "usd") as Currency,
      active: raw?.active !== false,
      // Packs saved before Paddle keep working through the built-in price ids.
      paddle_price_id: PRICE_ID_PATTERN.test(priceId) ? priceId : PADDLE_PACK_PRICES[id] || "",
    });
  }
  return packs;
}

export async function getCreditPacks(): Promise<CreditPack[]> {
  try {
    const raw = await readSetting(CREDIT_PACKS_KEY);
    if (raw === null) return DEFAULT_CREDIT_PACKS;
    return normalizePacks(JSON.parse(raw));
  } catch (err) {
    console.error("[credit-packs] unreadable setting, using defaults:", err);
    return DEFAULT_CREDIT_PACKS;
  }
}

/** The pack bought with a given Paddle price — used to derive credits at fulfilment. */
export async function getCreditPackByPriceId(priceId: string): Promise<CreditPack | null> {
  if (!priceId) return null;
  const packs = await getCreditPacks();
  return packs.find((pack) => pack.paddle_price_id === priceId) || null;
}

export async function getCreditPack(id: string): Promise<CreditPack | null> {
  const packs = await getCreditPacks();
  return packs.find((pack) => pack.id === id && pack.active) || null;
}
