import "server-only";
import { totalumSdk } from "@/lib/totalum";
import { getActiveSubscription, getPlanBySlug } from "@/lib/access";
import { applyCreditChange, getBalance } from "@/lib/credits";
import { getCreditPack, getCreditPackById } from "@/lib/credit-packs";
import { nowPaymentsProvider } from "@/lib/payments/nowpayments";
import type { CheckoutSession, PaymentProvider, ProviderTransaction } from "@/lib/payments/provider";
import type { OrderRecord, PlanRecord, SubscriptionRecord } from "@/lib/types";

/**
 * AIVEXA PRO + AI CREDITS billing.
 *
 * Flow: plan / pack → pending order → provider checkout → signed IPN →
 * verify (order, user, amount, currency, status) → order PAID →
 * subscription ACTIVE or credits granted. The browser's return URL never
 * activates anything.
 */

/** The active card provider. Providers are adapters behind `PaymentProvider`. */
export function paymentProvider(): PaymentProvider {
  return nowPaymentsProvider;
}

export async function isPaymentsConfigured(): Promise<boolean> {
  try {
    return (await paymentProvider().configStatus()) === "ENABLED";
  } catch (err) {
    console.error("[billing] config status failed:", err);
    return false;
  }
}

function orderNumber(): string {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `AVX-${stamp}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

const toCents = (amount: number) => Math.round(amount * 100);
const userIdOfOrder = (order: OrderRecord) => (typeof order.user === "object" ? order.user?._id : (order.user as string)) || "";

async function createPendingOrder(fields: Record<string, unknown>): Promise<string> {
  const created = await totalumSdk.crud.createRecord("orders", {
    order_number: orderNumber(),
    status: "pending",
    provider: paymentProvider().name,
    ...fields,
  });
  if (created.errors) {
    console.error("[billing] order create failed:", created.errors);
    throw new Error("Order create failed");
  }
  return String((created.data as any)?.insertedId || "");
}

export type BillingPeriod = "month" | "year";

export async function createPlanCheckout(
  user: { _id: string; email?: string },
  planSlug: string,
  period: BillingPeriod,
  origin: string
): Promise<CheckoutSession> {
  if (!(await isPaymentsConfigured())) throw new Error("PAYMENTS_NOT_CONFIGURED");
  const plan = await getPlanBySlug(planSlug);
  if (!plan || plan.active !== "yes") throw new Error("PLAN_NOT_AVAILABLE");
  const monthlyPrice = Number(plan.price);
  if (!Number.isFinite(monthlyPrice) || monthlyPrice <= 0) throw new Error("PLAN_PRICE_INVALID");
  const yearlyPrice = Number(plan.yearly_price);
  const isYear = period === "year" && Number.isFinite(yearlyPrice) && yearlyPrice > 0;
  const price = isYear ? yearlyPrice : monthlyPrice;
  const days = isYear ? 365 : Math.max(Number(plan.duration_days) || 30, 1);
  const currency = plan.currency || "usd";

  const orderId = await createPendingOrder({
    user: user._id,
    plan: plan._id,
    amount: price,
    currency,
    period: isYear ? "year" : "month",
    description: `${plan.name} — ${isYear ? "12 months" : `${days} days`}`,
  });
  console.log(`[billing] plan checkout: order ${orderId}, plan ${plan.slug}, period ${isYear ? "year" : "month"}, user ${user._id}`);
  return paymentProvider().createCheckout({
    orderId,
    userId: user._id,
    email: user.email,
    amount: price,
    currency,
    description: `${plan.name} — AIVEXA PRO`,
    successUrl: `${origin}/pro/success?order=${orderId}`,
    cancelUrl: `${origin}/pro?cancelled=1`,
  });
}

/** One-time credit pack purchase. Price and credit amount come from the server-side pack list. */
export async function createCreditsCheckout(
  user: { _id: string; email?: string },
  packId: string,
  origin: string
): Promise<CheckoutSession> {
  if (!(await isPaymentsConfigured())) throw new Error("PAYMENTS_NOT_CONFIGURED");
  const pack = await getCreditPack(packId);
  if (!pack) throw new Error("PACK_NOT_AVAILABLE");

  const orderId = await createPendingOrder({
    user: user._id,
    amount: pack.price,
    currency: pack.currency,
    price_id: pack.id,
    description: `AIVEXA CREDITS — ${pack.credits}`,
  });
  console.log(`[billing] credits checkout: order ${orderId}, pack ${pack.id}, user ${user._id}`);
  return paymentProvider().createCheckout({
    orderId,
    userId: user._id,
    email: user.email,
    amount: pack.price,
    currency: pack.currency,
    description: `AIVEXA CREDITS — ${pack.credits}`,
    successUrl: `${origin}/pro/success?order=${orderId}&kind=credits`,
    cancelUrl: `${origin}/pro?cancelled=1#credits`,
  });
}

async function loadOrder(orderId: string): Promise<OrderRecord | null> {
  if (!/^[a-f0-9]{24}$/.test(orderId)) return null;
  const result = await totalumSdk.crud.query("orders", { _filter: { _id: orderId }, _limit: 1, plan: true });
  if (result.errors) {
    console.error("[billing] order lookup failed:", result.errors);
    throw new Error("Order lookup failed");
  }
  return ((result.data || []) as unknown as OrderRecord[])[0] || null;
}

async function findOrderByPayment(providerPaymentId: string): Promise<OrderRecord | null> {
  const result = await totalumSdk.crud.query("orders", { _filter: { provider_payment_id: providerPaymentId }, _limit: 1, plan: true });
  if (result.errors) {
    console.error("[billing] order lookup by payment failed:", result.errors);
    throw new Error("Order lookup failed");
  }
  return ((result.data || []) as unknown as OrderRecord[])[0] || null;
}

// IPN retries and the success-page confirm can race — fulfil one order at a time per process.
const inFlight = new Map<string, Promise<FulfilOutcome>>();

export interface FulfilOutcome {
  status: "paid" | "pending" | "failed" | "mismatch" | "unknown_order" | "ignored";
  orderId?: string;
  kind?: "plan" | "credits";
  detail?: string;
}

/** Idempotent fulfilment of a provider transaction (IPN callback or API re-read). */
export async function fulfilTransaction(tx: ProviderTransaction): Promise<FulfilOutcome> {
  const key = tx.customData.order_id || tx.id;
  const running = inFlight.get(key);
  if (running) return running;
  const job = fulfilTransactionInner(tx).finally(() => inFlight.delete(key));
  inFlight.set(key, job);
  return job;
}

async function fulfilTransactionInner(tx: ProviderTransaction): Promise<FulfilOutcome> {
  const orderId = tx.customData.order_id || "";
  if (!orderId) return { status: "unknown_order", detail: "no order_id in payload" };

  const order = await loadOrder(orderId);
  if (!order) return { status: "unknown_order", orderId };
  const kind: "plan" | "credits" = order.plan ? "plan" : "credits";
  if (order.status === "paid" || order.status === "refunded") return { status: "paid", orderId, kind };
  if (order.provider_payment_id && order.provider_payment_id !== tx.id) {
    return { status: "mismatch", orderId, detail: "order already linked to another transaction" };
  }

  // The payment id is recorded on first sight so later (non-final) IPNs can still be matched.
  if (!order.provider_payment_id && tx.id) {
    await totalumSdk.crud.editRecordById("orders", orderId, { provider_payment_id: tx.id });
  }

  if (!tx.paid) {
    if (tx.status === "failed" || tx.status === "expired") {
      await totalumSdk.crud.editRecordById("orders", orderId, { status: "failed", provider_payment_id: tx.id });
      return { status: "failed", orderId, kind };
    }
    // waiting / confirming / confirmed / sending / partially_paid — logged only, order stays pending.
    return { status: "pending", orderId, kind };
  }

  // Amount and currency must match what the server put on the order (crypto-rate rounding tolerance: 1 cent).
  const expectedCents = toCents(Number(order.amount) || 0);
  const actualCents = toCents(Number(tx.amount) || 0);
  const problems: string[] = [];
  if (Math.abs(actualCents - expectedCents) > 1) problems.push(`amount ${actualCents} ≠ ${expectedCents}`);
  if (tx.currency !== (order.currency || "usd")) problems.push(`currency ${tx.currency} ≠ ${order.currency}`);
  if (problems.length > 0) {
    console.error("[billing] verification failed for order", orderId, problems.join("; "));
    await totalumSdk.crud.editRecordById("orders", orderId, {
      status: "failed",
      provider_payment_id: tx.id,
      description: `${order.description || ""} (verification failed: ${problems.join("; ")})`.slice(0, 250),
    });
    return { status: "mismatch", orderId, detail: problems.join("; ") };
  }

  const paid = await totalumSdk.crud.editRecordById("orders", orderId, {
    status: "paid",
    paid_at: new Date().toISOString(),
    provider_payment_id: tx.id,
  });
  if (paid.errors) {
    console.error("[billing] failed to mark order paid:", paid.errors);
    throw new Error("Order update failed");
  }

  const userId = userIdOfOrder(order);
  if (kind === "credits") {
    const pack = await getCreditPackById(order.price_id || "");
    if (!pack) throw new Error(`No credit pack for id ${order.price_id}`);
    await applyCreditChange({ userId, amount: pack.credits, type: "purchase", referenceId: orderId, description: `Credit pack: ${pack.credits}` });
  } else {
    const days = order.period === "year" ? 365 : undefined;
    await activatePlan(userId, order.plan as PlanRecord, paymentProvider().name, tx.id, orderId, days);
  }
  console.log(`[billing] order fulfilled: ${orderId} (${kind}) via ${tx.id}`);
  return { status: "paid", orderId, kind };
}

/** Provider says a previously paid order was refunded → order REFUNDED, access recalculated, ledger entry. */
export async function applyRefund(transactionId: string): Promise<FulfilOutcome> {
  const order = await findOrderByPayment(transactionId);
  if (!order) return { status: "unknown_order", detail: `no order for ${transactionId}` };
  if (order.status === "refunded") return { status: "ignored", orderId: order._id, detail: "already refunded" };

  const now = new Date().toISOString();
  const updated = await totalumSdk.crud.editRecordById("orders", order._id, { status: "refunded", refunded_at: now });
  if (updated.errors) throw new Error("Order refund update failed");

  const userId = userIdOfOrder(order);
  if (!order.plan) {
    // Remove the purchased credits that are still unspent — the balance never goes negative.
    const pack = await getCreditPackById(order.price_id || "");
    const remove = Math.min(pack?.credits || 0, await getBalance(userId));
    if (remove > 0) {
      await applyCreditChange({ userId, amount: -remove, type: "refund", referenceId: order._id, description: `Refund of credit pack (${order.order_number || order._id})` });
    }
  } else {
    const subs = await totalumSdk.crud.query("subscriptions", { _filter: { order: order._id }, _limit: 5 });
    for (const sub of (subs.data || []) as unknown as SubscriptionRecord[]) {
      const changed = await totalumSdk.crud.editRecordById("subscriptions", sub._id, { status: "refunded", end_date: now, auto_renew: "no" });
      if (changed.errors) console.error("[billing] failed to mark subscription refunded:", changed.errors);
    }
  }
  console.log(`[billing] refund applied to order ${order._id}`);
  return { status: "paid", orderId: order._id, kind: order.plan ? "plan" : "credits", detail: "refunded" };
}

/**
 * Self-service cancel: access kept until end_date, no automatic refund. AIVEXA
 * PRO never auto-renews on this provider (crypto payments are one-time), so
 * this only needs to update the local record.
 */
export async function cancelOwnSubscription(userId: string): Promise<{ endDate: string | null }> {
  const current = await getActiveSubscription(userId);
  if (!current) throw new Error("NO_ACTIVE_SUBSCRIPTION");
  if ((current as any).auto_renew === "no") return { endDate: current.end_date || null };

  const changed = await totalumSdk.crud.editRecordById("subscriptions", current._id, {
    auto_renew: "no",
    cancelled_at: new Date().toISOString(),
  });
  if (changed.errors) {
    console.error("[billing] failed to store cancellation:", changed.errors);
    throw new Error("Subscription update failed");
  }
  console.log(`[billing] user ${userId} cancelled subscription ${current._id}; access until ${current.end_date}`);
  return { endDate: current.end_date || null };
}

/**
 * Starts (or extends) a subscription. An active subscription is extended from
 * its current end date so paying early never loses days. `overrideDays` wins
 * over the plan's own `duration_days` (used for yearly purchases).
 */
export async function activatePlan(
  userId: string,
  plan: PlanRecord,
  provider: string,
  providerId: string,
  orderId?: string,
  overrideDays?: number
) {
  const days = Math.max(overrideDays || Number(plan.duration_days) || 30, 1);
  const current = await getActiveSubscription(userId);
  const start = current?.end_date && current.end_date > new Date().toISOString() ? new Date(current.end_date) : new Date();
  const end = new Date(start.getTime() + days * 86_400_000);

  const created = await totalumSdk.crud.createRecord("subscriptions", {
    user: userId,
    plan: plan._id,
    ...(orderId ? { order: orderId } : {}),
    status: "active",
    start_date: new Date().toISOString(),
    end_date: end.toISOString(),
    provider,
    provider_subscription_id: providerId,
    auto_renew: "no",
  });
  if (created.errors) {
    console.error("[billing] subscription create failed:", created.errors);
    throw new Error("Subscription create failed");
  }
  const subscriptionId = String((created.data as any)?.insertedId || "");
  if (current && current._id) {
    // The old record is superseded by the extended one.
    const superseded = await totalumSdk.crud.editRecordById("subscriptions", current._id, { status: "expired" });
    if (superseded.errors) console.error("[billing] failed to close superseded subscription:", superseded.errors);
  }

  const credits = Math.max(Math.trunc(Number(plan.ai_credits) || 0), 0);
  if (credits > 0) {
    await applyCreditChange({
      userId,
      amount: credits,
      type: "subscription",
      referenceId: subscriptionId,
      description: `${plan.name}: included AI credits`,
    });
  }
  console.log(`[billing] plan ${plan.slug} active for ${userId} until ${end.toISOString()}`);
  return { subscriptionId, endDate: end.toISOString() };
}

/** Status of one of the user's own orders (the success page polls this; it never activates anything). */
export async function getOwnOrderStatus(userId: string, orderId: string): Promise<FulfilOutcome> {
  const order = await loadOrder(orderId);
  if (!order || userIdOfOrder(order) !== userId) return { status: "unknown_order" };
  const kind: "plan" | "credits" = order.plan ? "plan" : "credits";
  if (order.status === "paid") return { status: "paid", orderId, kind };
  if (order.status === "failed" || order.status === "cancelled") return { status: "failed", orderId, kind };

  // IPN not received yet: re-read the payment from the provider API once we have seen one.
  if (order.provider_payment_id && (await isPaymentsConfigured())) {
    try {
      const tx = await paymentProvider().getTransaction(order.provider_payment_id);
      return fulfilTransaction(tx);
    } catch (err) {
      console.error("[billing] transaction re-read failed:", err);
    }
  }
  return { status: "pending", orderId, kind };
}

/** Active subscriptions ending within `days` with no renewal scheduled — used for the in-app renewal reminder. */
export async function getExpiringSoon(userId: string, days = 3): Promise<{ planName: string; endDate: string } | null> {
  const sub = await getActiveSubscription(userId);
  if (!sub || !sub.end_date) return null;
  const msLeft = new Date(sub.end_date).getTime() - Date.now();
  if (msLeft <= 0 || msLeft > days * 86_400_000) return null;
  const plan = sub.plan && typeof sub.plan === "object" ? (sub.plan as PlanRecord) : null;
  return { planName: plan?.name || "AIVEXA PRO", endDate: sub.end_date };
}
