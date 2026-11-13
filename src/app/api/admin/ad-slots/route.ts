import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { logAdminAction } from "@/lib/audit";
import { getAdSlotsConfig, saveAdSlotsConfig } from "@/lib/ad-slots";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    return NextResponse.json({ ok: true, data: await getAdSlotsConfig() });
  } catch (err: any) {
    console.error("[api/admin/ad-slots] GET error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    const body = await request.json().catch(() => ({}));
    const config = await saveAdSlotsConfig(body);
    await logAdminAction(admin._id, "ad_slots.update", "ad_slots_config", "singleton", {
      topEnabled: config.topEnabled,
      bottomEnabled: config.bottomEnabled,
      hasSocialBar: Boolean(config.socialBarCode),
    });
    console.log("[api/admin/ad-slots] saved by", admin._id);
    return NextResponse.json({ ok: true, data: config });
  } catch (err: any) {
    console.error("[api/admin/ad-slots] PUT error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Invalid ad code" }, { status: 400 });
  }
}
