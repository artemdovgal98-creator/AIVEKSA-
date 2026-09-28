import { NextResponse } from "next/server";
import { getServices } from "@/lib/catalog";
import { totalumSdk } from "@/lib/totalum";
import { attachPartnerOffers } from "@/lib/offers";
import type { ServiceRecord } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Public catalog API — also the API a future Telegram Mini App would consume.
 * GET /api/services?q=&category=&filter=&sort=&limit=&offset=
 * GET /api/services?slugs=chatgpt,canva   (used to resolve guest favorites)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slugs = searchParams.get("slugs");

    if (slugs) {
      const list = slugs.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 100);
      if (!list.length) return NextResponse.json({ ok: true, data: [], total: 0 });
      const result = await totalumSdk.crud.query("services", {
        _filter: { slug: { in: list }, active: "yes" },
        _limit: 100,
        category: true,
      });
      if (result.errors) console.error("[api/services] slugs query errors:", result.errors);
      const items = await attachPartnerOffers((result.data || []) as unknown as ServiceRecord[]);
      return NextResponse.json({ ok: true, data: items, total: items.length });
    }

    const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 24, 1), 100);
    const offset = Math.max(Number(searchParams.get("offset")) || 0, 0);
    const scopeParam = searchParams.get("scope");
    const scope = scopeParam === "main" || scopeParam === "affiliate" ? scopeParam : "all";

    const { items, total } = await getServices({
      q: searchParams.get("q") || undefined,
      categorySlug: searchParams.get("category") || undefined,
      filter: (searchParams.get("filter") as any) || "all",
      sort: (searchParams.get("sort") as any) || "popular",
      scope,
      limit,
      offset,
    });

    console.log(`[api/services] returned ${items.length}/${total} services (scope=${scope})`);
    return NextResponse.json({ ok: true, data: items, total });
  } catch (err: any) {
    console.error("[api/services] error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
