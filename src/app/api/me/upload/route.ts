import { NextResponse } from "next/server";
import { getCurrentDbUser } from "@/lib/admin-auth";
import { totalumSdk } from "@/lib/totalum";
import { MAX_PROFILE_PHOTOS, MAX_UPLOAD_BYTES, uploadToTotalum } from "@/lib/uploads";

export const dynamic = "force-dynamic";

/** Uploads profile photos for the signed-in user (max 5 files, 10 MB each). */
export async function POST(request: Request) {
  try {
    const user = await getCurrentDbUser();
    if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const form = await request.formData();
    const files = form.getAll("file").filter((entry): entry is File => entry instanceof File);
    if (files.length === 0) {
      return NextResponse.json({ ok: false, error: "Файл не передан" }, { status: 400 });
    }
    if (files.length > MAX_PROFILE_PHOTOS) {
      return NextResponse.json(
        { ok: false, error: `Не больше ${MAX_PROFILE_PHOTOS} фото за раз` },
        { status: 400 }
      );
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

    console.log("[api/me/upload] uploaded", uploaded.length, "photo(s) for", user._id);
    return NextResponse.json({ ok: true, data: { files: uploaded } });
  } catch (err: any) {
    console.error("[api/me/upload] error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
