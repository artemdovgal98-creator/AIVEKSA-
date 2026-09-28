import "server-only";
import { totalumSdk } from "@/lib/totalum";
import type { AccessType, PlanRecord, SubscriptionRecord } from "@/lib/types";

/**
 * Backend authorisation — the only source of truth for what a user may use.
 * Plan, price, subscription and payment state are ALWAYS read from the
 * database here; nothing the browser sends is trusted.
 *
 * `main_catalog` is always free: browsing, search, categories, AI pages,
 * AI Radar, AI Guide and recommendations never require a plan.
 */

type AnyUser = { _id?: string; id?: string } | null | undefined;

const userIdOf = (user: AnyUser): string => (user?._id || user?.id || "").trim();

export function planOf(subscription: SubscriptionRecord | null): PlanRecord | null {
  const plan = subscription?.plan;
  return plan && typeof plan === "object" ? (plan as PlanRecord) : null;
}

/**
 * The subscription currently granting access, if any. A record whose end date
 * has passed is lazily marked `expired` so the admin lists stay truthful.
 */
export async function getActiveSubscription(userId: string): Promise<SubscriptionRecord | null> {
  if (!userId) return null;
  const result = await totalumSdk.crud.query("subscriptions", {
    _filter: { user: userId, status: { in: ["active", "paid"] } },
    _sort: { end_date: "desc" },
    _limit: 10,
    plan: true,
  });
  if (result.errors) {
    console.error("[access] subscription lookup failed:", result.errors);
    throw new Error("Subscription lookup failed");
  }
  const now = new Date().toISOString();
  const rows = (result.data || []) as unknown as SubscriptionRecord[];
  let current: SubscriptionRecord | null = null;
  for (const row of rows) {
    if (row.end_date && row.end_date < now) {
      const expired = await totalumSdk.crud.editRecordById("subscriptions", row._id, { status: "expired" });
      if (expired.errors) console.error("[access] failed to expire subscription", row._id, expired.errors);
      else console.log("[access] subscription expired:", row._id);
      continue;
    }
    if (!current) current = row;
  }
  return current;
}

export async function hasAccess(user: AnyUser, accessType: AccessType): Promise<boolean> {
  // The main AI catalog is FREE for everyone, signed in or not.
  if (accessType === "main_catalog") return true;

  const userId = userIdOf(user);
  if (!userId) return false;

  if (accessType === "pro") {
    const subscription = await getActiveSubscription(userId);
    const rules = planOf(subscription)?.access_rules || [];
    const granted = Boolean(subscription) && rules.includes("pro");
    console.log(`[access] pro for ${userId}: ${granted}`);
    return granted;
  }

  return false;
}

/** Plans that can be shown publicly (the catalog itself is never a plan). */
export async function getActivePlans(): Promise<PlanRecord[]> {
  const result = await totalumSdk.crud.query("plans", {
    _filter: { active: "yes" },
    _sort: { order_position: "asc" },
    _limit: 20,
  });
  if (result.errors) {
    console.error("[access] plans lookup failed:", result.errors);
    throw new Error("Plans lookup failed");
  }
  return (result.data || []) as unknown as PlanRecord[];
}

export async function getPlanBySlug(slug: string): Promise<PlanRecord | null> {
  const result = await totalumSdk.crud.query("plans", { _filter: { slug }, _limit: 1 });
  if (result.errors) {
    console.error("[access] plan lookup failed:", result.errors);
    throw new Error("Plan lookup failed");
  }
  return (((result.data || []) as unknown as PlanRecord[])[0]) || null;
}
