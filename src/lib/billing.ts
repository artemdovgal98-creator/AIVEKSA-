import "server-only";
import { totalumSdk } from "@/lib/totalum";
import { getActiveSubscription, getPlanBySlug } from "@/lib/access";
import { applyCreditChange, getBalance } from "@/lib/credits";
import { getCreditPack, getCreditPackByPriceId } from "@/lib/credit-packs";
import { PADDLE_PLAN_PRICES, paddleApiConfigured, paddleProvider } from "@/lib/payments/paddle";
import type { CheckoutSession, PaymentProvider, ProviderTransaction } from "@/lib/payments/provider";
import type { OrderRecord, PlanRecord, SubscriptionRecord } from "@/lib/types";

/**
 * AIVEXA PRO + AI CREDITS billing.
 *
 * Flow: plan / pack → pending order → provider checkout → signed webhook →
 * verify (order, user, price id, amount, currency, status) → order PAID →
 * subscription ACTIVE or credits granted. The browser's return URL never
 * activates anything.
 */

/** The active card provider. Providers are adapters behind `PaymentProvider`. */
export function paymentProvider(): PaymentProvider {
  return paddleProvider;
}

export function isPaymentsConfigured(): boolean {
  return paymentProvider().configStatus() === "ENABLED";
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

export async function createPlanCheckout(
  user: { _id: string; email?: string },
  planSlug: string,
  origin: string
): Promise<CheckoutSession> {
  if (!isPaymentsConfigured()) throw new Error("PAYMENTS_NOT_CONFIGURED");
  const plan = await getPlanBySlug(planSlug);
  if (!plan || plan.active !== "yes") throw new Error("PLAN_NOT_AVAILABLE");
  const price = Number(plan.price);
  if (!Number.isFinite(price) || price <= 0) throw new Error("PLAN_PRICE_INVALID");
  const priceId = PADDLE_PLAN_PRICES[plan.slug];
  if (!priceId) throw new Error("PRICE_NOT_CONFIGURED");

  const orderId = await createPendingOrder({
    user: user._id,
    plan: plan._id,
    amount: price,
    currency: plan.currency || "usd",
    price_id: priceId,
    description: `${plan.name} — ${plan.duration_days || 30} days`,
  });
  console.log(`[billing] plan checkout: order ${orderId}, plan ${plan.slug}, user ${user._id}`);
  return paymentProvider().createCheckout({
    orderId,
    userId: user._id,
    email: user.email,
    priceId,
    successUrl: `${origin}/pro/success?order=${orderId}`,
  });
}

/** One-time credit pack purchase. Price and credit amount come from the server-side pack list. */
export async function createCreditsCheckout(
  user: { _id: string; email?: string },
  packId: string,
  origin: string
): Promise<CheckoutSession> {
  if (!isPaymentsConfigured()) throw new Error("PAYMENTS_NOT_CONFIGURED");
  const pack = await getCreditPack(packId);
  if (!pack) throw new Error("PACK_NOT_AVAILABLE");
  if (!pack.paddle_price_id) throw new Error("PRICE_NOT_CONFIGURED");

  const orderId = await createPendingOrder({
    user: user._id,
    amount: pack.price,
    currency: pack.currency,
    price_id: pack.paddle_price_id,
    description: `AIVEXA CREDITS — ${pack.credits}`,
  });
  console.log(`[billing] credits checkout: order ${orderId}, pack ${pack.id}, user ${user._id}`);
  return paymentProvider().createCheckout({
    orderId,
    userId: user._id,
    email: user.email,
    priceId: pack.paddle_price_id,
    successUrl: `${origin}/pro/success?order=${orderId}&kind=credits`,
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

// Webhook retries and the success-page confirm can race — fulfil one order at a time per process.
const inFlight = new Map<string, Promise<FulfilOutcome>>();

export interface FulfilOutcome {
  status: "paid" | "pending" | "failed" | "mismatch" | "unknown_order" | "ignored";
  orderId?: string;
  kind?: "plan" | "credits";
  detail?: string;
}

/** Idempotent fulfilment of a provider transaction (webhook or API re-read). */
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
  // Subscription renewals are created by the provider, not by our checkout.
  if (!orderId) {
    if (tx.subscriptionId && tx.paid) return fulfilRenewal(tx);
    return { status: "unknown_order", detail: "no order_id in custom_data" };
  }

  const order = await loadOrder(orderId);
  if (!order) return { status: "unknown_order", orderId };
  const kind: "plan" | "credits" = order.plan ? "plan" : "credits";
  if (order.status === "paid" || order.status === "refunded") return { status: "paid", orderId, kind };
  if (order.provider_payment_id && order.provider_payment_id !== tx.id) {
    return { status: "mismatch", orderId, detail: "order already linked to another transaction" };
  }

  // Ownership: the order must belong to the user written in custom data.
  if (userIdOfOrder(order) !== tx.customData.user_id) {
    console.error("[billing] user mismatch for order", orderId);
    return { status: "mismatch", orderId, detail: "user mismatch" };
  }

  if (!tx.paid) {
    if (tx.status === "canceled") {
      await totalumSdk.crud.editRecordById("orders", orderId, { status: "failed" });
      return { status: "failed", orderId, kind };
    }
    return { status: "pending", orderId, kind };
  }

  // Price id, amount and currency must match what the server put on the order.
  const item = tx.items.find((entry) => entry.priceId === order.price_id);
  const expectedCents = toCents(Number(order.amount) || 0);
  const problems: string[] = [];
  if (!item) problems.push(`price ${tx.items.map((i) => i.priceId).join(",")} ≠ ${order.price_id}`);
  else if (item.unitAmountMinor !== expectedCents) problems.push(`amount ${item.unitAmountMinor} ≠ ${expectedCents}`);
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
    const pack = await getCreditPackByPriceId(order.price_id || "");
    if (!pack) throw new Error(`No credit pack for price ${order.price_id}`);
    await applyCreditChange({ userId, amount: pack.credits, type: "purchase", referenceId: orderId, description: `Credit pack: ${pack.credits}` });
  } else {
    await activatePlan(userId, order.plan as PlanRecord, paymentProvider().name, tx.subscriptionId || tx.id, orderId, tx.billingPeriodEndsAt);
  }
  console.log(`[billing] order fulfilled: ${orderId} (${kind}) via ${tx.id}`);
  return { status: "paid", orderId, kind };
}

/** Recurring PRO payment: extend the subscription that owns this provider subscription id. */
async function fulfilRenewal(tx: ProviderTransaction): Promise<FulfilOutcome> {
  const existing = await findOrderByPayment(tx.id);
  if (existing) return { status: "paid", orderId: existing._id, kind: "plan" };

  const subs = await totalumSdk.crud.query("subscriptions", {
    _filter: { provider_subscription_id: tx.subscriptionId },
    _sort: { end_date: "desc" },
    _limit: 1,
    plan: true,
  });
  if (subs.errors) throw new Error("Subscription lookup failed");
  const sub = ((subs.data || []) as unknown as SubscriptionRecord[])[0];
  const plan = sub?.plan && typeof sub.plan === "object" ? (sub.plan as PlanRecord) : null;
  const userId = sub ? (typeof sub.user === "object" ? sub.user?._id : (sub.user as string)) || "" : "";
  if (!sub || !plan || !userId) return { status: "unknown_order", detail: `no local subscription ${tx.subscriptionId}` };

  const priceId = PADDLE_PLAN_PRICES[plan.slug];
  const item = tx.items.find((entry) => entry.priceId === priceId);
  if (!item) return { status: "mismatch", detail: "renewal price does not match plan" };

  const orderId = await createPendingOrder({
    user: userId,
    plan: plan._id,
    amount: item.unitAmountMinor / 100,
    currency: tx.currency === "eur" ? "eur" : "usd",
    price_id: priceId,
    description: `${plan.name} — renewal`,
  });
  const paid = await totalumSdk.crud.editRecordById("orders", orderId, {
    status: "paid",
    paid_at: new Date().toISOString(),
    provider_payment_id: tx.id,
  });
  if (paid.errors) throw new Error("Renewal order update failed");
  await activatePlan(userId, plan, paymentProvider().name, tx.subscriptionId || tx.id, orderId, tx.billingPeriodEndsAt);
  console.log(`[billing] renewal fulfilled: ${orderId} for ${userId} (${tx.subscriptionId})`);
  return { status: "paid", orderId, kind: "plan" };
}

/** Approved refund (provider adjustment) → order REFUNDED, access recalculated, ledger entry. */
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
    const pack = await getCreditPackByPriceId(order.price_id || "");
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

/** Provider says the recurring subscription ended → no auto-renew; access ends at the paid period. */
export async function applyProviderCancellation(subscriptionId: string, effectiveAt: string | null): Promise<FulfilOutcome> {
  const subs = await totalumSdk.crud.query("subscriptions", { _filter: { provider_subscription_id: subscriptionId }, _limit: 10 });
  if (subs.errors) throw new Error("Subscription lookup failed");
  const rows = (subs.data || []) as unknown as SubscriptionRecord[];
  if (rows.length === 0) return { status: "unknown_order", detail: `no local subscription ${subscriptionId}` };
  const now = new Date().toISOString();
  const endsAt = effectiveAt && effectiveAt < now ? effectiveAt : now;
  for (const sub of rows) {
    if (sub.status !== "active" && sub.status !== "paid") continue;
    const end = sub.end_date && sub.end_date < endsAt ? sub.end_date : endsAt;
    const changed = await totalumSdk.crud.editRecordById("subscriptions", sub._id, {
      status: "cancelled",
      auto_renew: "no",
      cancelled_at: (sub as any).cancelled_at || now,
      end_date: end,
    });
    if (changed.errors) console.error("[billing] failed to cancel subscription:", changed.errors);
  }
  return { status: "paid", detail: "cancelled" };
}

/**
 * Self-service cancel: auto-renew OFF at the provider, access kept until
 * end_date, no automatic refund. The local status stays active until the
 * period ends, then the provider's `subscription.canceled` closes it.
 */
export async function cancelOwnSubscription(userId: string): Promise<{ endDate: string | null }> {
  const current = await getActiveSubscription(userId);
  if (!current) throw new Error("NO_ACTIVE_SUBSCRIPTION");
  if ((current as any).auto_renew === "no") return { endDate: current.end_date || null };

  const providerSubId = current.provider_subscription_id || "";
  if (current.provider === "paddle" && providerSubId.startsWith("sub_")) {
    if (!paddleApiConfigured()) throw new Error("CANCEL_NOT_CONFIGURED");
    await paymentProvider().cancelSubscription(providerSubId);
  }
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
 * its current end date so paying early never loses days. `periodEndsAt` (the
 * provider's billing period end) wins when it is later.
 */
export async function activatePlan(
  userId: string,
  plan: PlanRecord,
  provider: string,
  providerId: string,
  orderId?: string,
  periodEndsAt?: string | null
) {
  const days = Math.max(Number(plan.duration_days) || 30, 1);
  const current = await getActiveSubscription(userId);
  const start = current?.end_date && current.end_date > new Date().toISOString() ? new Date(current.end_date) : new Date();
  let end = new Date(start.getTime() + days * 86_400_000);
  if (periodEndsAt && !Number.isNaN(Date.parse(periodEndsAt)) && new Date(periodEndsAt) > end) end = new Date(periodEndsAt);

  const created = await totalumSdk.crud.createRecord("subscriptions", {
    user: userId,
    plan: plan._id,
    ...(orderId ? { order: orderId } : {}),
    status: "active",
    start_date: new Date().toISOString(),
    end_date: end.toISOString(),
    provider,
    provider_subscription_id: providerId,
    auto_renew: providerId.startsWith("sub_") ? "yes" : "no",
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
export async function getOwnOrderStatus(userId: string, orderId: string, transactionId?: string): Promise<FulfilOutcome> {
  const order = await loadOrder(orderId);
  if (!order || userIdOfOrder(order) !== userId) return { status: "unknown_order" };
  const kind: "plan" | "credits" = order.plan ? "plan" : "credits";
  if (order.status === "paid") return { status: "paid", orderId, kind };
  if (order.status === "failed" || order.status === "cancelled") return { status: "failed", orderId, kind };

  // Webhook not here yet: re-read the transaction from the provider API (server-side verification).
  if (transactionId && paddleApiConfigured()) {
    const tx = await paymentProvider().getTransaction(transactionId);
    if (tx.customData.order_id === orderId) return fulfilTransaction(tx);
  }
  return { status: "pending", orderId, kind };
}
