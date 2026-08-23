import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { totalumSdk } from "@/lib/totalum";
import { buildCategoryPayload } from "@/lib/admin-payload";

export const dynamic = "force-dynamic";

/** PUT — full update (also used by the activate / deactivate switches). */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const payload = buildCategoryPayload(body);

    const updated = await totalumSdk.crud.editRecordById("categories", id, payload);
    if (updated.errors) {
      console.error("[api/admin/categories] update errors:", updated.errors);
      return NextResponse.json({ ok: false, error: updated.errors }, { status: 400 });
    }
    console.log("[api/admin/categories] updated", id, "by", admin._id);
    return NextResponse.json({ ok: true, data: updated.data });
  } catch (err: any) {
    console.error("[api/admin/categories] PUT error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}

/** DELETE — remove a record permanently. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const deleted = await totalumSdk.crud.deleteRecordById("categories", id);
    if (deleted.errors) {
      console.error("[api/admin/categories] delete errors:", deleted.errors);
      return NextResponse.json({ ok: false, error: deleted.errors }, { status: 400 });
    }
    console.log("[api/admin/categories] deleted", id, "by", admin._id);
    return NextResponse.json({ ok: true, data: { id } });
  } catch (err: any) {
    console.error("[api/admin/categories] DELETE error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
