import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { totalumSdk } from "@/lib/totalum";
import { MAX_UPLOAD_BYTES, uploadToTotalum } from "@/lib/uploads";

export const dynamic = "force-dynamic";

/**
 * Shared admin upload endpoint.
 *
 * Returns the Totalum file-name id that the caller links to a record's file
 * field as `{ name: fileName }`. Nothing is written to a record here.
 */
export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

    const form = await request.formData();
    const files = form.getAll("file").filter((entry): entry is File => entry instanceof File);
    if (files.length === 0) {
      return NextResponse.json({ ok: false, error: "Файл не передан" }, { status: 400 });
    }

    const uploaded: { name: string; originalName: string }[] = [];
    for (const file of files) {
      if (file.size > MAX_UPLOAD_BYTES) {
        return NextResponse.json(
          { ok: false, error: `Файл "${file.name}" больше 10 МБ` },
          { status: 400 }
        );
      }
      const name = await uploadToTotalum(totalumSdk, file);
      uploaded.push({ name, originalName: file.name });
    }

    console.log("[api/admin/upload] uploaded", uploaded.length, "file(s) by", admin._id);
    return NextResponse.json({ ok: true, data: { files: uploaded } });
  } catch (err: any) {
    console.error("[api/admin/upload] error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
