import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { totalumSdk } from "@/lib/totalum";
import { buildCategoryPayload } from "@/lib/admin-payload";
import { logAdminAction } from "@/lib/audit";

export const dynamic = "force-dynamic";

/** GET — full list for the admin panel (includes inactive records). */
export async function GET(request: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || "").trim();
    const filter: Record<string, any> = {};
    if (q) filter.name_ru = { regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), options: "i" };

    const result = await totalumSdk.crud.query("categories", {
      _filter: filter,
      _sort: { order_position: "asc" },
      _limit: 500,
      
    });
    if (result.errors) console.error("[api/admin/categories] list errors:", result.errors);

    // How many services reference each category (shown before delete / reassign).
    const grouped = await totalumSdk.crud.query("services", { _groupBy: "category", _aggregate: { _count: true }, _limit: 1000 });
    if (grouped.errors) console.error("[api/admin/categories] service counts failed:", grouped.errors);
    const counts = new Map<string, number>();
    for (const row of (grouped.data || []) as any[]) {
      const ref = row._group?.category;
      const id = (ref && typeof ref === "object" ? ref._id : ref) || "";
      if (id) counts.set(id, Number(row._aggregate?._count) || 0);
    }
    const data = ((result.data || []) as any[]).map((category) => ({ ...category, services_count: counts.get(category._id) || 0 }));
    return NextResponse.json({ ok: true, data, total: data.length });
  } catch (err: any) {
    console.error("[api/admin/categories] GET error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}

/** POST — create a record. */
export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

    const body = await request.json().catch(() => ({}));
    const payload = buildCategoryPayload(body);
    if (!payload.slug) {
      return NextResponse.json({ ok: false, error: "Slug is required" }, { status: 400 });
    }

    const duplicate = await totalumSdk.crud.query("categories", { _filter: { slug: payload.slug }, _limit: 1 });
    if ((duplicate.data || []).length) {
      return NextResponse.json({ ok: false, error: "Slug already exists" }, { status: 409 });
    }

    const created = await totalumSdk.crud.createRecord("categories", payload);
    if (created.errors) {
      console.error("[api/admin/categories] create errors:", created.errors);
      return NextResponse.json({ ok: false, error: created.errors }, { status: 400 });
    }
    console.log("[api/admin/categories] created", payload.slug, "by", admin._id);
    await logAdminAction(admin._id, "category.create", "categories", String((created.data as any)?.insertedId || ""), { slug: payload.slug });
    return NextResponse.json({ ok: true, data: created.data });
  } catch (err: any) {
    console.error("[api/admin/categories] POST error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
