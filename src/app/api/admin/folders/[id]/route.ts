import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { totalumSdk } from "@/lib/totalum";
import { buildFolderPayload } from "@/lib/admin-payload";

export const dynamic = "force-dynamic";

/** PUT — update a material. */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const payload = buildFolderPayload(body);
    if (!payload.title) {
      return NextResponse.json({ ok: false, error: "Название обязательно" }, { status: 400 });
    }

    const updated = await totalumSdk.crud.editRecordById("prompt_folders", id, payload);
    if (updated.errors) {
      console.error("[api/admin/folders] update errors:", updated.errors);
      return NextResponse.json({ ok: false, error: updated.errors }, { status: 400 });
    }

    const fresh = await totalumSdk.crud.getRecordById("prompt_folders", id);
    console.log("[api/admin/folders] updated", id, "by", admin._id);
    return NextResponse.json({ ok: true, data: fresh.data });
  } catch (err: any) {
    console.error("[api/admin/folders] PUT error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}

/** DELETE — remove a material permanently. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const deleted = await totalumSdk.crud.deleteRecordById("prompt_folders", id);
    if (deleted.errors) {
      console.error("[api/admin/folders] delete errors:", deleted.errors);
      return NextResponse.json({ ok: false, error: deleted.errors }, { status: 400 });
    }
    console.log("[api/admin/folders] deleted", id, "by", admin._id);
    return NextResponse.json({ ok: true, data: { id } });
  } catch (err: any) {
    console.error("[api/admin/folders] DELETE error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
