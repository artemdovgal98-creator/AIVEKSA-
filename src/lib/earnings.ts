import { totalumSdk } from "@/lib/totalum";
import { addMoney, type Money } from "@/lib/money";
import { CONVERSION_STATUSES, EARNED_STATUSES, type ConversionStatus, type Currency } from "@/lib/types";

/**
 * A "conversion" is simply a click record that carries a real commission
 * reported by an affiliate network (manually by the owner or by a webhook).
 * Records without `conversion_status` are ordinary clicks and hold no money.
 */
export interface ConversionRow {
  _id: string;
  service: string | null;
  earned_amount: number;
  currency: Currency;
  conversion_status: ConversionStatus;
  manual_entry: "yes" | "no";
  clicked_at: string;
}

/** Every record that carries money. Nothing here is estimated or generated. */
export async function loadConversions(serviceId?: string): Promise<ConversionRow[]> {
  const filter: Record<string, any> = { conversion_status: { in: CONVERSION_STATUSES } };
  if (serviceId) filter.service = serviceId;

  const result = await totalumSdk.crud.query("clicks", {
    _filter: filter,
    _sort: { clicked_at: "desc" },
    _limit: 2000,
  });
  if (result.errors) {
    console.error("[earnings] failed to load conversions:", result.errors);
    throw new Error("Failed to load conversions");
  }

  return ((result.data || []) as any[]).map((row) => ({
    _id: row._id,
    service: typeof row.service === "object" ? row.service?._id || null : row.service || null,
    earned_amount: Number(row.earned_amount) || 0,
    currency: (row.currency || "usd") as Currency,
    conversion_status: (row.conversion_status || "pending") as ConversionStatus,
    manual_entry: row.manual_entry === "yes" ? "yes" : "no",
    clicked_at: row.clicked_at || row.createdAt || "",
  }));
}

export interface EarningsTotals {
  /** Confirmed + paid — money the owner really has / will get. */
  earned: Money;
  /** Reported but not yet approved by the network. */
  pending: Money;
}

function inRange(row: ConversionRow, sinceIso?: string): boolean {
  if (!sinceIso) return true;
  return Boolean(row.clicked_at) && row.clicked_at >= sinceIso;
}

export function totalsFor(rows: ConversionRow[], sinceIso?: string): EarningsTotals {
  const totals: EarningsTotals = { earned: {}, pending: {} };
  for (const row of rows) {
    if (!inRange(row, sinceIso)) continue;
    if (EARNED_STATUSES.includes(row.conversion_status)) addMoney(totals.earned, row.currency, row.earned_amount);
    else if (row.conversion_status === "pending") addMoney(totals.pending, row.currency, row.earned_amount);
    // "rejected" is money the network refused — never counted.
  }
  return totals;
}

/** serviceId -> earned / pending, used for the per-AI column in Affiliate Manager. */
export function totalsByService(rows: ConversionRow[]): Map<string, EarningsTotals> {
  const map = new Map<string, EarningsTotals>();
  for (const row of rows) {
    if (!row.service) continue;
    const entry = map.get(row.service) || { earned: {}, pending: {} };
    if (EARNED_STATUSES.includes(row.conversion_status)) addMoney(entry.earned, row.currency, row.earned_amount);
    else if (row.conversion_status === "pending") addMoney(entry.pending, row.currency, row.earned_amount);
    map.set(row.service, entry);
  }
  return map;
}

export function daysAgoIso(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}
