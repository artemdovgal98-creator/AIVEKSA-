import { CURRENCIES, type Currency } from "@/lib/types";

/**
 * Commissions are reported by each affiliate network in its own currency, so a
 * total is always a small map of currency -> amount. Never summed across
 * currencies (that would invent an exchange rate we do not have).
 */
export type Money = Partial<Record<Currency, number>>;

export const CURRENCY_SYMBOLS: Record<Currency, string> = { usd: "$", eur: "€" };

export function isCurrency(value: any): value is Currency {
  return CURRENCIES.includes(value);
}

export function addMoney(target: Money, currency: Currency, amount: number): Money {
  if (!Number.isFinite(amount) || amount === 0) return target;
  target[currency] = Number(((target[currency] || 0) + amount).toFixed(2));
  return target;
}

export function mergeMoney(target: Money, source?: Money | null): Money {
  for (const currency of CURRENCIES) addMoney(target, currency, source?.[currency] || 0);
  return target;
}

export function moneyIsZero(money?: Money | null): boolean {
  return !money || CURRENCIES.every((currency) => Math.abs(money[currency] || 0) < 0.005);
}

/** "$120.00 · €30.00" — every non-zero currency, nothing rounded away silently. */
export function formatMoney(money?: Money | null): string {
  const parts = CURRENCIES.filter((currency) => Math.abs(money?.[currency] || 0) >= 0.005).map(
    (currency) => `${CURRENCY_SYMBOLS[currency]}${(money?.[currency] || 0).toFixed(2)}`
  );
  return parts.length > 0 ? parts.join(" · ") : `${CURRENCY_SYMBOLS.usd}0.00`;
}
