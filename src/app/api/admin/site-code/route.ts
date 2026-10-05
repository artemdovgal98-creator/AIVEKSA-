import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { upsertSetting } from "@/lib/settings";
import { logAdminAction } from "@/lib/audit";
import { getSiteCode, invalidateSiteCode, parseSiteCode } from "@/lib/site-code";
import { SITE_CODE_SLOTS, SITE_CODE_MAX, siteCodeSettingKey } from "@/lib/site-code-slots";

export const dynamic = "force-dynamic";

async function snapshot() {
  invalidateSiteCode();
  const values = await getSiteCode();
  const counts = Object.fromEntries(SITE_CODE_SLOTS.map((slot) => [slot.key, parseSiteCode(values[slot.key] || "").length]));
  return { values, counts };
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

/** PUT { values: Record<slotKey, string> } — only <meta> and <script> tags are rendered on the site. */
export async function PUT(request: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    const body = (await request.json().catch(() => ({}))) as { values?: Record<string, unknown> };
    const values = body.values || {};
    const changed: string[] = [];
    for (const slot of SITE_CODE_SLOTS) {
      if (typeof values[slot.key] !== "string") continue;
      const value = (values[slot.key] as string).trim();
      if (value.length > SITE_CODE_MAX) return NextResponse.json({ ok: false, error: "Code is too long" }, { status: 400 });
      if (value && parseSiteCode(value).length === 0) {
        return NextResponse.json({ ok: false, error: "NO_TAGS" }, { status: 400 });
      }
      await upsertSetting(siteCodeSettingKey(slot.key), value, `Custom code: ${slot.key}`);
      changed.push(slot.key);
    }
    await logAdminAction(admin._id, "site_code.update", "admin_settings", "site_code", { changed });
    console.log("[api/admin/site-code] updated:", changed.join(", ") || "nothing");
    return NextResponse.json({ ok: true, data: await snapshot() });
  } catch (err: any) {
    console.error("[api/admin/site-code] PUT error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
