import { NextResponse } from "next/server";
import { getRadarItems } from "@/lib/catalog";
import { RADAR_TYPES, type RadarType } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Public AI Radar feed — active entries only, pinned first. */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const requested = searchParams.get("type") || "all";
    const type = RADAR_TYPES.includes(requested as RadarType) ? (requested as RadarType) : "all";
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "40", 10) || 40, 1), 100);

    const items = await getRadarItems({ type, limit });
    return NextResponse.json({ ok: true, data: items, total: items.length });
  } catch (err: any) {
    console.error("[api/radar] error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
