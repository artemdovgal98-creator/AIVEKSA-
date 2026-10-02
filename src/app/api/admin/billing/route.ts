import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { totalumSdk } from "@/lib/totalum";
import { isPaymentsConfigured } from "@/lib/billing";

export const dynamic = "force-dynamic";

const SOURCES = {
  orders: { table: "orders", expand: { user: true, plan: true } },
  payments: { table: "orders", expand: { user: true, plan: true } },
  subscriptions: { table: "subscriptions", expand: { user: true, plan: true } },
  transactions: { table: "ai_credit_transactions", expand: { user: true } },
} as const;

const STATUS = /^[a-z_]{1,30}$/;

/**
 * GET ?type=orders|subscriptions|transactions|payments&status=
 * `payments` = orders that reached the payment provider (paid / failed / refunded).
 */
export async function GET(request: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    const { searchParams } = new URL(request.url);
    const type = (searchParams.get("type") || "orders") as keyof typeof SOURCES;
    const source = SOURCES[type];
    if (!source) return NextResponse.json({ ok: false, error: "Invalid type" }, { status: 400 });

    const filter: Record<string, any> = {};
    const status = searchParams.get("status") || "";
    if (status && STATUS.test(status)) filter[type === "transactions" ? "type" : "status"] = status;
    else if (type === "payments") filter.status = { in: ["paid", "failed", "refunded"] };

    const result = await totalumSdk.crud.query(source.table, {
      _filter: filter,
      _sort: { createdAt: "desc" },
      _limit: 300,
      ...source.expand,
    });
    if (result.errors) {
      console.error("[api/admin/billing] query errors:", result.errors);
      return NextResponse.json({ ok: false, error: result.errors }, { status: 500 });
    }
    const slim = (user: any) => (user && typeof user === "object" ? { _id: user._id, name: user.name, email: user.email } : null);
    const rows = ((result.data || []) as any[]).map((row) => ({
      ...row,
      user: slim(row.user),
      plan: row.plan && typeof row.plan === "object" ? { _id: row.plan._id, name: row.plan.name } : null,
    }));
    return NextResponse.json({ ok: true, data: { rows, paymentsConfigured: await isPaymentsConfigured() } });
  } catch (err: any) {
    console.error("[api/admin/billing] GET error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
