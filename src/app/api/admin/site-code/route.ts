import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { upsertSetting } from "@/lib/settings";
import { logAdminAction } from "@/lib/audit";
import { SITE_CODE_KEYS, SITE_CODE_MAX, getSiteCode, invalidateSiteCode, parseSiteCode } from "@/lib/site-code";

export const dynamic = "force-dynamic";

async function snapshot() {
  invalidateSiteCode();
  const code = await getSiteCode();
  return { ...code, headTags: parseSiteCode(code.head).length, bodyTags: parseSiteCode(code.body).length };
}

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    return NextResponse.json({ ok: true, data: await snapshot() });
  } catch (err: any) {
    console.error("[api/admin/site-code] GET error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}

/** PUT { head?: string, body?: string } — only <meta> and <script> tags are rendered on the site. */
export async function PUT(request: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const changed: string[] = [];
    for (const field of ["head", "body"] as const) {
      if (typeof body[field] !== "string") continue;
      const value = (body[field] as string).trim();
      if (value.length > SITE_CODE_MAX) return NextResponse.json({ ok: false, error: "Code is too long" }, { status: 400 });
      if (value && parseSiteCode(value).length === 0) {
        return NextResponse.json({ ok: false, error: "NO_TAGS" }, { status: 400 });
      }
      await upsertSetting(SITE_CODE_KEYS[field], value, field === "head" ? "Custom code in <head>" : "Custom code before </body>");
      changed.push(field);
    }
    await logAdminAction(admin._id, "site_code.update", "admin_settings", "site_code", { changed });
    console.log("[api/admin/site-code] updated:", changed.join(", ") || "nothing");
    return NextResponse.json({ ok: true, data: await snapshot() });
  } catch (err: any) {
    console.error("[api/admin/site-code] PUT error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
