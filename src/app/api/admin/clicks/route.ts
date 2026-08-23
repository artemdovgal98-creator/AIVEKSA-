import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { totalumSdk } from "@/lib/totalum";
import { readCount } from "@/lib/aggregate";

export const dynamic = "force-dynamic";

/** Paginated raw click log — real records only. */
export async function GET(request: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get("limit")) || 50, 200);
    const offset = Number(searchParams.get("offset")) || 0;
    const serviceSlug = (searchParams.get("service") || "").trim();

    // Optional per-service view, used by the "View Clicks" action of the
    // Affiliate Manager.
    // Commission entries (manual_entry) are money records, not visitor clicks.
    const filter: Record<string, any> = { manual_entry: { ne: "yes" } };
    if (serviceSlug) {
      const serviceResult = await totalumSdk.crud.query("services", {
        _filter: { slug: serviceSlug },
        _limit: 1,
      });
      const service = (serviceResult.data || [])[0];
      if (!service) return NextResponse.json({ ok: true, data: [], total: 0 });
      filter.service = service._id;
    }

    const result = await totalumSdk.crud.query("clicks", {
      _filter: filter,
      _sort: { clicked_at: "desc" },
      _limit: limit,
      _offset: offset,
      service: true,
      user: true,
    });
    if (result.errors) console.error("[api/admin/clicks] list errors:", result.errors);

    const countResult = await totalumSdk.crud.query("clicks", {
      _filter: filter,
      _aggregate: { _count: true },
    });

    return NextResponse.json({
      ok: true,
      data: result.data || [],
      total: readCount(countResult),
    });
  } catch (err: any) {
    console.error("[api/admin/clicks] error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
