import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { totalumSdk } from "@/lib/totalum";
import { buildRadarPayload } from "@/lib/admin-payload";

export const dynamic = "force-dynamic";

/** GET — full AI Radar feed for the admin panel (includes hidden entries). */
export async function GET(request: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || "").trim();
    const filter: Record<string, any> = {};
    if (q) {
      const regex = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter._or = ["title_ru", "title_uk", "title_en", "source_name"].map((field) => ({
        [field]: { regex, options: "i" },
      }));
    }

    const result = await totalumSdk.crud.query("ai_radar", {
      _filter: filter,
      _sort: { published_at: "desc" },
      _limit: 300,
      service: true,
      category: true,
    });
    if (result.errors) console.error("[api/admin/radar] list errors:", result.errors);
    return NextResponse.json({ ok: true, data: result.data || [], total: (result.data || []).length });
  } catch (err: any) {
    console.error("[api/admin/radar] GET error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}

/** POST — publish a new radar entry. */
export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

    const body = await request.json().catch(() => ({}));
    const payload = buildRadarPayload(body);
    if (!payload.title_ru && !payload.title_en && !payload.title_uk) {
      return NextResponse.json({ ok: false, error: "Нужен хотя бы один заголовок" }, { status: 400 });
    }

    const created = await totalumSdk.crud.createRecord("ai_radar", payload);
    if (created.errors) {
      console.error("[api/admin/radar] create errors:", created.errors);
      return NextResponse.json({ ok: false, error: created.errors }, { status: 400 });
    }
    console.log("[api/admin/radar] created radar entry by", admin._id);
    return NextResponse.json({ ok: true, data: created.data });
  } catch (err: any) {
    console.error("[api/admin/radar] POST error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
