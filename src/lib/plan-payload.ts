import { PLAN_ACCESS_RULES } from "@/lib/types";

const str = (value: unknown, max = 5000) => (typeof value === "string" ? value.trim().slice(0, max) : "");
const int = (value: unknown, fallback: number, min = 0, max = 1_000_000) => {
  const n = Math.trunc(Number(value));
  return Number.isFinite(n) ? Math.min(Math.max(n, min), max) : fallback;
};
const yesNo = (value: unknown, fallback: "yes" | "no") =>
  value === "yes" || value === true ? "yes" : value === "no" || value === false ? "no" : fallback;

/** Validates an admin plan form. Prices are stored with 2 decimals. */
export function buildPlanPayload(body: any): { payload: Record<string, any>; error?: string } {
  const name = str(body?.name, 80);
  if (name.length < 2) return { payload: {}, error: "Name is required" };
  const slug = str(body?.slug, 40).toLowerCase() || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (!/^[a-z0-9-]{1,40}$/.test(slug)) return { payload: {}, error: "Slug must be latin letters, digits and dashes" };
  const price = Math.round(Number(body?.price) * 100) / 100;
  if (!Number.isFinite(price) || price < 0 || price > 10_000) return { payload: {}, error: "Invalid price" };
  const currency = body?.currency === "eur" ? "eur" : "usd";
  const rules = (Array.isArray(body?.access_rules) ? body.access_rules : []).filter((rule: unknown) =>
    (PLAN_ACCESS_RULES as readonly string[]).includes(String(rule))
  );
  return {
    payload: {
      name,
      slug,
      price,
      currency,
      duration_days: int(body?.duration_days, 30, 1, 3650),
      description: str(body?.description, 2000),
      features: str(body?.features, 5000),
      access_rules: rules,
      ai_credits: int(body?.ai_credits, 0),
      social_limit: int(body?.social_limit, 0),
      publishing_limit: int(body?.publishing_limit, 0),
      scheduling: yesNo(body?.scheduling, "no"),
      analytics: yesNo(body?.analytics, "no"),
      order_position: int(body?.order_position, 1, 0, 9999),
      active: yesNo(body?.active, "yes"),
    },
  };
}
