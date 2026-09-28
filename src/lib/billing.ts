import "server-only";
import { totalumSdk } from "@/lib/totalum";
import { getStripe } from "@/lib/stripe";
import { getActiveSubscription, getPlanBySlug } from "@/lib/access";
import { applyCreditChange } from "@/lib/credits";
import { getCreditPack } from "@/lib/credit-packs";
import type { OrderRecord, PlanRecord } from "@/lib/types";

/**
 * AIVEXA PRO billing. Prices ALWAYS come from the `plans` table — the browser
 * only says which plan slug it wants. A payment is fulfilled only after the
 * session has been re-read from Stripe and its amount matches the order.
 */

export function isPaymentsConfigured(): boolean {
  return Boolean((process.env.STRIPE_SECRET_KEY || "").trim());
}

function orderNumber(): string {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `AVX-${stamp}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

const toCents = (amount: number) => Math.round(amount * 100);

export async function createPlanCheckout(
  user: { _id: string; email?: string },
  planSlug: string,
  origin: string
): Promise<{ url: string; orderId: string }> {
  if (!isPaymentsConfigured()) throw new Error("PAYMENTS_NOT_CONFIGURED");
  const plan = await getPlanBySlug(planSlug);
  if (!plan || plan.active !== "yes") throw new Error("PLAN_NOT_AVAILABLE");
  const price = Number(plan.price);
  if (!Number.isFinite(price) || price <= 0) throw new Error("PLAN_PRICE_INVALID");
  const currency = plan.currency || "usd";

  const created = await totalumSdk.crud.createRecord("orders", {
    order_number: orderNumber(),
    user: user._id,
    plan: plan._id,
    amount: price,
    currency,
    status: "pending",
    provider: "stripe",
    description: `${plan.name} — ${plan.duration_days || 30} days`,
  });
  if (created.errors) {
    console.error("[billing] order create failed:", created.errors);
    throw new Error("Order create failed");
  }
  const orderId = String((created.data as any)?.insertedId || "");

  const session = await getStripe().checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency,
          unit_amount: toCents(price),
          product_data: { name: plan.name, description: `${plan.duration_days || 30} days` },
        },
      },
    ],
    customer_email: user.email || undefined,
    client_reference_id: user._id,
    metadata: { order_id: orderId, user_id: user._id, plan_id: plan._id },
    success_url: `${origin}/pro/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/pro?cancelled=1`,
  });

  const linked = await totalumSdk.crud.editRecordById("orders", orderId, { provider_payment_id: session.id });
  if (linked.errors) console.error("[billing] failed to link session to order:", linked.errors);
  console.log(`[billing] checkout created: order ${orderId}, plan ${plan.slug}, user ${user._id}`);
  return { url: session.url || "", orderId };
}

/** One-time credit pack purchase. Price and credit amount come from the server-side pack list. */
export async function createCreditsCheckout(
  user: { _id: string; email?: string },
  packId: string,
  origin: string
): Promise<{ url: string; orderId: string }> {
  if (!isPaymentsConfigured()) throw new Error("PAYMENTS_NOT_CONFIGURED");
  const pack = await getCreditPack(packId);
  if (!pack) throw new Error("PACK_NOT_AVAILABLE");

  const created = await totalumSdk.crud.createRecord("orders", {
    order_number: orderNumber(),
    user: user._id,
    amount: pack.price,
    currency: pack.currency,
    status: "pending",
    provider: "stripe",
    description: `AIVEXA CREDITS — ${pack.credits}`,
  });
  if (created.errors) {
    console.error("[billing] credits order create failed:", created.errors);
    throw new Error("Order create failed");
  }
  const orderId = String((created.data as any)?.insertedId || "");

  const session = await getStripe().checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: pack.currency,
          unit_amount: toCents(pack.price),
          product_data: { name: `AIVEXA CREDITS × ${pack.credits}` },
        },
      },
    ],
    customer_email: user.email || undefined,
    client_reference_id: user._id,
    // Written by the server — Stripe returns it untouched, so it is trusted at fulfilment.
    metadata: { order_id: orderId, user_id: user._id, kind: "credits", credits: String(pack.credits), pack_id: pack.id },
    success_url: `${origin}/pro/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/pro?cancelled=1#credits`,
  });

  const linked = await totalumSdk.crud.editRecordById("orders", orderId, { provider_payment_id: session.id });
  if (linked.errors) console.error("[billing] failed to link session to order:", linked.errors);
  console.log(`[billing] credits checkout created: order ${orderId}, pack ${pack.id}, user ${user._id}`);
  return { url: session.url || "", orderId };
}

/** Idempotent fulfilment — safe to call from both the webhook and the success page. */
export async function fulfilCheckoutSession(sessionId: string): Promise<{ status: string; orderId?: string; kind?: string }> {
  if (!isPaymentsConfigured()) return { status: "not_configured" };
  if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return { status: "invalid" };

  const session = await getStripe().checkout.sessions.retrieve(sessionId);
  const orderId = String(session.metadata?.order_id || "");
  if (!orderId) return { status: "unknown_order" };
  const kind = session.metadata?.kind === "credits" ? "credits" : "plan";

  const orderResult = await totalumSdk.crud.query("orders", { _filter: { _id: orderId }, _limit: 1, plan: true });
  const order = ((orderResult.data || []) as unknown as OrderRecord[])[0];
  if (!order) return { status: "unknown_order" };
  if (order.status === "paid") return { status: "paid", orderId, kind };
  if (order.provider_payment_id && order.provider_payment_id !== session.id) return { status: "mismatch", orderId };

  if (session.payment_status !== "paid") {
    if (session.status === "expired") {
      await totalumSdk.crud.editRecordById("orders", orderId, { status: "failed" });
      return { status: "failed", orderId };
    }
    return { status: "pending", orderId };
  }

  const expectedCents = toCents(Number(order.amount) || 0);
  if (session.amount_total !== expectedCents || (session.currency || "").toLowerCase() !== (order.currency || "usd")) {
    console.error("[billing] amount mismatch for order", orderId, session.amount_total, expectedCents);
    await totalumSdk.crud.editRecordById("orders", orderId, { status: "failed", description: `${order.description || ""} (amount mismatch)` });
    return { status: "mismatch", orderId };
  }

  const paid = await totalumSdk.crud.editRecordById("orders", orderId, {
    status: "paid",
    paid_at: new Date().toISOString(),
    provider_payment_id: String(session.payment_intent || session.id),
  });
  if (paid.errors) {
    console.error("[billing] failed to mark order paid:", paid.errors);
    throw new Error("Order update failed");
  }

  const userId = typeof order.user === "object" ? order.user?._id : (order.user as string);
  const plan = order.plan && typeof order.plan === "object" ? (order.plan as PlanRecord) : null;
  if (userId && kind === "credits") {
    const credits = Math.max(Math.trunc(Number(session.metadata?.credits) || 0), 0);
    if (credits > 0) {
      await applyCreditChange({ userId, amount: credits, type: "purchase", referenceId: orderId, description: `Credit pack: ${credits}` });
    }
  } else if (userId && plan) {
    await activatePlan(userId, plan, "stripe", String(session.id), orderId);
  }
  console.log(`[billing] order fulfilled: ${orderId} (${kind})`);
  return { status: "paid", orderId, kind };
}

/**
 * Starts (or extends) a subscription. An active subscription is extended from
 * its current end date so paying early never loses days.
 */
export async function activatePlan(userId: string, plan: PlanRecord, provider: string, providerId: string, orderId?: string) {
  const days = Math.max(Number(plan.duration_days) || 30, 1);
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
