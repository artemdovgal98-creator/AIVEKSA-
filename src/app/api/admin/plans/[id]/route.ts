import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { totalumSdk } from "@/lib/totalum";
import { buildPlanPayload } from "@/lib/plan-payload";
import { logAdminAction } from "@/lib/audit";
import { readCount } from "@/lib/aggregate";

export const dynamic = "force-dynamic";
const OBJECT_ID = /^[a-f0-9]{24}$/i;

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    const { id } = await params;
    if (!OBJECT_ID.test(id)) return NextResponse.json({ ok: false, error: "Invalid id" }, { status: 400 });
    const { payload, error } = buildPlanPayload(await request.json().catch(() => ({})));
    if (error) return NextResponse.json({ ok: false, error }, { status: 400 });
    const duplicate = await totalumSdk.crud.query("plans", { _filter: { slug: payload.slug, _id: { ne: id } }, _limit: 1 });
    if ((duplicate.data || []).length) return NextResponse.json({ ok: false, error: "Slug already exists" }, { status: 409 });
    const before = await totalumSdk.crud.getRecordById("plans", id);
    if (!before.data) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    const updated = await totalumSdk.crud.editRecordById("plans", id, payload);
    if (updated.errors) {
      console.error("[api/admin/plans] update errors:", updated.errors);
      return NextResponse.json({ ok: false, error: updated.errors }, { status: 400 });
    }
    const old = before.data as any;
    await logAdminAction(admin._id, "plan.update", "plans", id, {
      price: { from: old.price, to: payload.price },
      currency: { from: old.currency, to: payload.currency },
      duration_days: { from: old.duration_days, to: payload.duration_days },
      active: { from: old.active, to: payload.active },
    });
    return NextResponse.json({ ok: true, data: { _id: id } });
  } catch (err: any) {
    console.error("[api/admin/plans] PUT error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}

/** A plan that has (had) subscriptions or orders is deactivated instead of deleted. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    const { id } = await params;
    if (!OBJECT_ID.test(id)) return NextResponse.json({ ok: false, error: "Invalid id" }, { status: 400 });
    const [subs, orders] = await Promise.all([
      totalumSdk.crud.query("subscriptions", { _filter: { plan: id }, _aggregate: { _count: true } }),
      totalumSdk.crud.query("orders", { _filter: { plan: id }, _aggregate: { _count: true } }),
    ]);
    if (readCount(subs) + readCount(orders) > 0) {
      const r = await totalumSdk.crud.editRecordById("plans", id, { active: "no" });
      if (r.errors) return NextResponse.json({ ok: false, error: r.errors }, { status: 400 });
      await logAdminAction(admin._id, "plan.deactivate", "plans", id, "Plan has history — deactivated instead of deleted");
      return NextResponse.json({ ok: true, data: { _id: id, deactivated: true } });
    }
    const deleted = await totalumSdk.crud.deleteRecordById("plans", id);
    if (deleted.errors) return NextResponse.json({ ok: false, error: deleted.errors }, { status: 400 });
    await logAdminAction(admin._id, "plan.delete", "plans", id);
    return NextResponse.json({ ok: true, data: { _id: id, deleted: true } });
  } catch (err: any) {
    console.error("[api/admin/plans] DELETE error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
