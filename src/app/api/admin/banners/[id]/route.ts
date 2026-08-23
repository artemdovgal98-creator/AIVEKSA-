import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { totalumSdk } from "@/lib/totalum";
import { buildBannerPayload } from "@/lib/admin-payload";

export const dynamic = "force-dynamic";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const updated = await totalumSdk.crud.editRecordById("banners", id, buildBannerPayload(body));
    if (updated.errors) {
      console.error("[api/admin/banners] update errors:", updated.errors);
      return NextResponse.json({ ok: false, error: updated.errors }, { status: 400 });
    }
    console.log("[api/admin/banners] updated", id, "by", admin._id);
    return NextResponse.json({ ok: true, data: updated.data });
  } catch (err: any) {
    console.error("[api/admin/banners] PUT error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const deleted = await totalumSdk.crud.deleteRecordById("banners", id);
    if (deleted.errors) {
      console.error("[api/admin/banners] delete errors:", deleted.errors);
      return NextResponse.json({ ok: false, error: deleted.errors }, { status: 400 });
    }
    console.log("[api/admin/banners] deleted", id, "by", admin._id);
    return NextResponse.json({ ok: true, data: { id } });
  } catch (err: any) {
    console.error("[api/admin/banners] DELETE error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
