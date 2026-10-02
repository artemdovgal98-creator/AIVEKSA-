import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { totalumSdk } from "@/lib/totalum";
import { buildPlanPayload } from "@/lib/plan-payload";
import { logAdminAction } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    const [plans, subs] = await Promise.all([
      totalumSdk.crud.query("plans", { _sort: { order_position: "asc" }, _limit: 100 }),
      totalumSdk.crud.query("subscriptions", { _filter: { status: { in: ["active", "paid"] } }, _groupBy: "plan", _aggregate: { _count: true }, _limit: 100 }),
    ]);
    if (plans.errors) {
      console.error("[api/admin/plans] list errors:", plans.errors);
      return NextResponse.json({ ok: false, error: plans.errors }, { status: 500 });
    }
    const active = new Map<string, number>();
    for (const row of (subs.data || []) as any[]) {
      const ref = row._group?.plan;
      const id = (ref && typeof ref === "object" ? ref._id : ref) || "";
      if (id) active.set(id, Number(row._aggregate?._count) || 0);
    }
    const data = ((plans.data || []) as any[]).map((plan) => ({ ...plan, active_subscriptions: active.get(plan._id) || 0 }));
    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    console.error("[api/admin/plans] GET error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    const { payload, error } = buildPlanPayload(await request.json().catch(() => ({})));
    if (error) return NextResponse.json({ ok: false, error }, { status: 400 });
    const duplicate = await totalumSdk.crud.query("plans", { _filter: { slug: payload.slug }, _limit: 1 });
    if ((duplicate.data || []).length) return NextResponse.json({ ok: false, error: "Slug already exists" }, { status: 409 });
    const created = await totalumSdk.crud.createRecord("plans", payload);
    if (created.errors) {
      console.error("[api/admin/plans] create errors:", created.errors);
      return NextResponse.json({ ok: false, error: created.errors }, { status: 400 });
    }
    const id = String((created.data as any)?.insertedId || "");
    await logAdminAction(admin._id, "plan.create", "plans", id, { slug: payload.slug, price: payload.price, currency: payload.currency });
    return NextResponse.json({ ok: true, data: { _id: id } });
  } catch (err: any) {
    console.error("[api/admin/plans] POST error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
