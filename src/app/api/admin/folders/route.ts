import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { totalumSdk } from "@/lib/totalum";
import { buildFolderPayload } from "@/lib/admin-payload";

export const dynamic = "force-dynamic";

/** GET — every material, including inactive ones. */
export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

    const result = await totalumSdk.crud.query("prompt_folders", {
      _sort: { order_position: "asc" },
      _limit: 300,
    });
    if (result.errors) {
      console.error("[api/admin/folders] list errors:", result.errors);
      return NextResponse.json({ ok: false, error: result.errors }, { status: 400 });
    }
    return NextResponse.json({ ok: true, data: result.data || [], total: (result.data || []).length });
  } catch (err: any) {
    console.error("[api/admin/folders] GET error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}

/** POST — create a material, or upload a file when sent as multipart. */
export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

    const contentType = request.headers.get("content-type") || "";

    // Multipart = file upload; returns the Totalum file-name id for the record.
    if (contentType.includes("multipart/form-data")) {
      const incoming = await request.formData();
      const file = incoming.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json({ ok: false, error: "Файл не передан" }, { status: 400 });
      }
      const forward = new FormData();
      forward.append("file", file, file.name);
      const uploaded = await totalumSdk.files.uploadFile(forward);
      if (uploaded.errors) {
        console.error("[api/admin/folders] upload errors:", uploaded.errors);
        return NextResponse.json({ ok: false, error: uploaded.errors }, { status: 400 });
      }
      console.log("[api/admin/folders] uploaded", file.name, "->", uploaded.data);
      return NextResponse.json({ ok: true, data: { fileName: uploaded.data, originalName: file.name } });
    }

    const body = await request.json().catch(() => ({}));
    const payload = buildFolderPayload(body);
    if (!payload.title) {
      return NextResponse.json({ ok: false, error: "Название обязательно" }, { status: 400 });
    }

    const created = await totalumSdk.crud.createRecord("prompt_folders", payload);
    if (created.errors) {
      console.error("[api/admin/folders] create errors:", created.errors);
      return NextResponse.json({ ok: false, error: created.errors }, { status: 400 });
    }
    console.log("[api/admin/folders] created", payload.title, "by", admin._id);
    return NextResponse.json({ ok: true, data: created.data });
  } catch (err: any) {
    console.error("[api/admin/folders] POST error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
