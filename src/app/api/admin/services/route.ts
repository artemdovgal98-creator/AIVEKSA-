import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { totalumSdk } from "@/lib/totalum";
import { buildServicePayload } from "@/lib/admin-payload";

export const dynamic = "force-dynamic";

/** GET — full list for the admin panel (includes inactive records). */
export async function GET(request: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || "").trim();
    const filter: Record<string, any> = {};
    if (q) filter.name = { regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), options: "i" };

    const result = await totalumSdk.crud.query("services", {
      _filter: filter,
      _sort: { name: "asc" },
      _limit: 500,
      category: true,
    });
    if (result.errors) console.error("[api/admin/services] list errors:", result.errors);
    return NextResponse.json({ ok: true, data: result.data || [], total: (result.data || []).length });
  } catch (err: any) {
    console.error("[api/admin/services] GET error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}

/** POST — create a record. */
export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

    const body = await request.json().catch(() => ({}));
    const payload = buildServicePayload(body);
    if (!payload.slug) {
      return NextResponse.json({ ok: false, error: "Slug is required" }, { status: 400 });
    }

    const duplicate = await totalumSdk.crud.query("services", { _filter: { slug: payload.slug }, _limit: 1 });
    if ((duplicate.data || []).length) {
      return NextResponse.json({ ok: false, error: "Slug already exists" }, { status: 409 });
    }

    const created = await totalumSdk.crud.createRecord("services", payload);
    if (created.errors) {
      console.error("[api/admin/services] create errors:", created.errors);
      return NextResponse.json({ ok: false, error: created.errors }, { status: 400 });
    }
    console.log("[api/admin/services] created", payload.slug, "by", admin._id);
    return NextResponse.json({ ok: true, data: created.data });
  } catch (err: any) {
    console.error("[api/admin/services] POST error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
