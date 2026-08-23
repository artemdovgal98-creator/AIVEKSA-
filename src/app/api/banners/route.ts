import { NextResponse } from "next/server";
import { getBanners } from "@/lib/catalog";
import type { BannerRecord } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const position = (searchParams.get("position") || undefined) as BannerRecord["position"];
    const banners = await getBanners(position);
    return NextResponse.json({ ok: true, data: banners });
  } catch (err: any) {
    console.error("[api/banners] error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
