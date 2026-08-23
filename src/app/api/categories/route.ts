import { NextResponse } from "next/server";
import { getCategories } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const categories = await getCategories(true);
    return NextResponse.json({ ok: true, data: categories, total: categories.length });
  } catch (err: any) {
    console.error("[api/categories] error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
