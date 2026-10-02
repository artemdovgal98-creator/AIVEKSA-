import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { totalumSdk } from "@/lib/totalum";
import { buildCategoryPayload } from "@/lib/admin-payload";
import { logAdminAction } from "@/lib/audit";

export const dynamic = "force-dynamic";

const OBJECT_ID = /^[a-f0-9]{24}$/i;

/** PUT — full update (also used by the activate / deactivate switches and sorting). */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    if (!OBJECT_ID.test(id)) return NextResponse.json({ ok: false, error: "Invalid id" }, { status: 400 });
    const body = await request.json().catch(() => ({}));
    const payload = buildCategoryPayload(body);

    const updated = await totalumSdk.crud.editRecordById("categories", id, payload);
    if (updated.errors) {
      console.error("[api/admin/categories] update errors:", updated.errors);
      return NextResponse.json({ ok: false, error: updated.errors }, { status: 400 });
    }
    console.log("[api/admin/categories] updated", id, "by", admin._id);
    await logAdminAction(admin._id, "category.update", "categories", id, { slug: payload.slug, active: payload.active, order_position: payload.order_position });
    return NextResponse.json({ ok: true, data: updated.data });
  } catch (err: any) {
    console.error("[api/admin/categories] PUT error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}

/**
 * DELETE ?reassignTo=<categoryId|none>
 * A category that services still reference is never deleted blindly: without
 * `reassignTo` the API answers 409 with the number of services; with it the
 * services are moved first (or left without a category for `none`).
 */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    if (!OBJECT_ID.test(id)) return NextResponse.json({ ok: false, error: "Invalid id" }, { status: 400 });
    const reassignTo = new URL(request.url).searchParams.get("reassignTo") || "";

    const referencing = await totalumSdk.crud.query("services", { _filter: { category: id }, _limit: 2000 });
    if (referencing.errors) {
      console.error("[api/admin/categories] reference lookup failed:", referencing.errors);
      return NextResponse.json({ ok: false, error: "Reference lookup failed" }, { status: 500 });
    }
    const services = (referencing.data || []) as any[];

    if (services.length) {
      if (!reassignTo) {
        return NextResponse.json(
          { ok: false, error: "CATEGORY_IN_USE", code: "CATEGORY_IN_USE", data: { services: services.length } },
          { status: 409 }
        );
      }
      if (reassignTo !== "none") {
        if (!OBJECT_ID.test(reassignTo) || reassignTo === id) {
          return NextResponse.json({ ok: false, error: "Invalid target category" }, { status: 400 });
        }
        const target = await totalumSdk.crud.getRecordById("categories", reassignTo);
        if (!target.data) return NextResponse.json({ ok: false, error: "Target category not found" }, { status: 404 });
      }
      for (const service of services) {
        const moved = await totalumSdk.crud.editRecordById("services", service._id, { category: reassignTo === "none" ? null : reassignTo });
        if (moved.errors) {
          console.error("[api/admin/categories] reassign failed for", service._id, moved.errors);
          return NextResponse.json({ ok: false, error: "Reassign failed — category was NOT deleted" }, { status: 500 });
        }
      }
      console.log(`[api/admin/categories] reassigned ${services.length} services from ${id} to ${reassignTo}`);
    }

    const deleted = await totalumSdk.crud.deleteRecordById("categories", id);
    if (deleted.errors) {
      console.error("[api/admin/categories] delete errors:", deleted.errors);
      return NextResponse.json({ ok: false, error: deleted.errors }, { status: 400 });
    }
    console.log("[api/admin/categories] deleted", id, "by", admin._id);
    await logAdminAction(admin._id, "category.delete", "categories", id, { reassignedServices: services.length, reassignTo: reassignTo || null });
    return NextResponse.json({ ok: true, data: { id, reassigned: services.length } });
  } catch (err: any) {
    console.error("[api/admin/categories] DELETE error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
