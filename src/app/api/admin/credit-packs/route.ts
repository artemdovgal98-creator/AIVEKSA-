import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { upsertSetting } from "@/lib/settings";
import { logAdminAction } from "@/lib/audit";
import { CREDIT_PACKS_KEY, getCreditPacks, normalizePacks } from "@/lib/credit-packs";

export const dynamic = "force-dynamic";

/** GET — current credit packs. PUT { packs } — replaces the list (validated, audited). */
export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    return NextResponse.json({ ok: true, data: await getCreditPacks() });
  } catch (err: any) {
    console.error("[api/admin/credit-packs] GET error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    const body = (await request.json().catch(() => ({}))) as { packs?: unknown };
    const input = Array.isArray(body.packs) ? body.packs : [];
    const packs = normalizePacks(input);
    if (packs.length !== input.length) {
      return NextResponse.json({ ok: false, error: "Invalid pack: id a-z0-9-, credits 1–100000, price 0.50–10000, unique ids" }, { status: 400 });
    }
    await upsertSetting(CREDIT_PACKS_KEY, JSON.stringify(packs), "One-time AIVEXA CREDITS packs");
    await logAdminAction(admin._id, "credit_packs.update", "admin_settings", CREDIT_PACKS_KEY, { packs });
    console.log(`[api/admin/credit-packs] saved ${packs.length} packs`);
    return NextResponse.json({ ok: true, data: packs });
  } catch (err: any) {
    console.error("[api/admin/credit-packs] PUT error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
