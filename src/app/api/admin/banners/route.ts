import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { totalumSdk } from "@/lib/totalum";
import { buildBannerPayload } from "@/lib/admin-payload";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

    const result = await totalumSdk.crud.query("banners", { _sort: { createdAt: "desc" }, _limit: 200 });
    if (result.errors) console.error("[api/admin/banners] list errors:", result.errors);
    return NextResponse.json({ ok: true, data: result.data || [] });
  } catch (err: any) {
    console.error("[api/admin/banners] GET error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

    const body = await request.json().catch(() => ({}));
    const payload = buildBannerPayload(body);
    if (!payload.banner_image || !payload.banner_url) {
      return NextResponse.json({ ok: false, error: "Image and target URL are required" }, { status: 400 });
    }

    const created = await totalumSdk.crud.createRecord("banners", payload);
    if (created.errors) {
      console.error("[api/admin/banners] create errors:", created.errors);
      return NextResponse.json({ ok: false, error: created.errors }, { status: 400 });
    }
    console.log("[api/admin/banners] created banner by", admin._id);
    return NextResponse.json({ ok: true, data: created.data });
  } catch (err: any) {
    console.error("[api/admin/banners] POST error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
