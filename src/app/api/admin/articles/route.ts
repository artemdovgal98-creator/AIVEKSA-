import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { totalumSdk } from "@/lib/totalum";
import { buildArticlePayload } from "@/lib/admin-payload";

export const dynamic = "force-dynamic";

/** GET — full list for the admin panel (includes inactive records). */
export async function GET(request: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || "").trim();
    const filter: Record<string, any> = {};
    if (q) filter.title = { regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), options: "i" };

    const result = await totalumSdk.crud.query("articles", {
      _filter: filter,
      _sort: { createdAt: "desc" },
      _limit: 500,
      category: true,
    });
    if (result.errors) console.error("[api/admin/articles] list errors:", result.errors);
    return NextResponse.json({ ok: true, data: result.data || [], total: (result.data || []).length });
  } catch (err: any) {
    console.error("[api/admin/articles] GET error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}

/** POST — create a record. */
export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

    const body = await request.json().catch(() => ({}));
    const payload = buildArticlePayload(body);
    if (!payload.slug) {
      return NextResponse.json({ ok: false, error: "Slug is required" }, { status: 400 });
    }

    const duplicate = await totalumSdk.crud.query("articles", { _filter: { slug: payload.slug }, _limit: 1 });
    if ((duplicate.data || []).length) {
      return NextResponse.json({ ok: false, error: "Slug already exists" }, { status: 409 });
    }

    const created = await totalumSdk.crud.createRecord("articles", payload);
    if (created.errors) {
      console.error("[api/admin/articles] create errors:", created.errors);
      return NextResponse.json({ ok: false, error: created.errors }, { status: 400 });
    }
    console.log("[api/admin/articles] created", payload.slug, "by", admin._id);
    return NextResponse.json({ ok: true, data: created.data });
  } catch (err: any) {
    console.error("[api/admin/articles] POST error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
