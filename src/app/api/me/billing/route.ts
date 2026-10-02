import { NextResponse } from "next/server";
import { getCurrentDbUser } from "@/lib/admin-auth";
import { totalumSdk } from "@/lib/totalum";
import { getActiveSubscription, planOf } from "@/lib/access";
import { getBalance } from "@/lib/credits";
import { isPaymentsConfigured } from "@/lib/billing";
import type { CreditTransactionRecord, OrderRecord } from "@/lib/types";

export const dynamic = "force-dynamic";

/** The signed-in user's plan, subscription, credits and payment history. */
export async function GET() {
  try {
    const user = await getCurrentDbUser();
    if (!user) return NextResponse.json({ ok: false, error: "Sign in required" }, { status: 401 });

    const [subscription, balance, orders, transactions, lastSubscription] = await Promise.all([
      getActiveSubscription(user._id),
      getBalance(user._id),
      totalumSdk.crud.query("orders", { _filter: { user: user._id }, _sort: { createdAt: "desc" }, _limit: 30 }),
      totalumSdk.crud.query("ai_credit_transactions", { _filter: { user: user._id }, _sort: { createdAt: "desc" }, _limit: 20 }),
      totalumSdk.crud.query("subscriptions", { _filter: { user: user._id }, _sort: { end_date: "desc" }, _limit: 1, plan: true }),
    ]);
    if (orders.errors || transactions.errors) console.error("[api/me/billing] query errors:", orders.errors, transactions.errors);

    const shown = subscription || ((lastSubscription.data || [])[0] as any) || null;
    const plan = planOf(shown);
    return NextResponse.json({
      ok: true,
      data: {
        plan: subscription && plan ? { name: plan.name, slug: plan.slug } : null,
        subscription: shown
          ? {
              status: shown.status,
              start_date: shown.start_date,
              end_date: shown.end_date,
              plan_name: plan?.name || null,
              auto_renew: shown.auto_renew || "no",
              cancelled_at: shown.cancelled_at || null,
              cancellable: Boolean(subscription) && shown.auto_renew === "yes",
            }
          : null,
        credits: balance,
        orders: ((orders.data || []) as unknown as OrderRecord[]).map((order) => ({
          _id: order._id,
          order_number: order.order_number,
          amount: order.amount,
          currency: order.currency,
          status: order.status,
          description: order.description,
          createdAt: order.createdAt,
          paid_at: order.paid_at,
        })),
        transactions: ((transactions.data || []) as unknown as CreditTransactionRecord[]).map((tx) => ({
          _id: tx._id,
          amount: tx.amount,
          type: tx.type,
          balance_after: tx.balance_after,
          description: tx.description,
          createdAt: tx.createdAt,
        })),
        paymentsConfigured: isPaymentsConfigured(),
      },
    });
  } catch (err: any) {
    console.error("[api/me/billing] error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
