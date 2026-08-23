import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { totalumSdk } from "@/lib/totalum";
import { readCount, readSum } from "@/lib/aggregate";
import type { CategoryRecord, ClickRecord, ServiceRecord } from "@/lib/types";

export const dynamic = "force-dynamic";

function daysAgoIso(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

function startOfTodayIso(): string {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

async function countClicksSince(iso?: string): Promise<number> {
  const filter = iso ? { clicked_at: { gte: iso } } : {};
  const result = await totalumSdk.crud.query("clicks", {
    _filter: filter,
    _aggregate: { _count: true },
  });
  if (result.errors) console.error("[api/admin/stats] click count errors:", result.errors);
  return readCount(result);
}

/** Dashboard metrics — every number comes from real records, nothing is fabricated. */
export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

    const [
      servicesTotal,
      servicesActive,
      usersTotal,
      viewsSum,
      withAffiliate,
      clicksTotal,
      clicksToday,
      clicksWeek,
      clicksMonth,
    ] = await Promise.all([
      totalumSdk.crud.query("services", { _aggregate: { _count: true } }),
      totalumSdk.crud.query("services", { _filter: { active: "yes" }, _aggregate: { _count: true } }),
      totalumSdk.crud.query("user", { _aggregate: { _count: true } }),
      totalumSdk.crud.query("services", { _aggregate: { _sum: { views: true } } }),
      totalumSdk.crud.query("services", {
        _filter: { is_affiliate: "yes", affiliate_url: { ne: "" } },
        _aggregate: { _count: true },
      }),
      countClicksSince(),
      countClicksSince(startOfTodayIso()),
      countClicksSince(daysAgoIso(7)),
      countClicksSince(daysAgoIso(30)),
    ]);

    const totalServices = readCount(servicesTotal);
    const totalViews = readSum(viewsSum, "views");
    const affiliateCount = readCount(withAffiliate);

    // Per-service click counts, computed by the database (no N+1 loop).
    const topResult = await totalumSdk.crud.query("services", {
      _limit: 300,
      _select: { name: true, slug: true, logo_url: true },
      category: true,
      clicks: { _count: true, _include: false },
    });
    if (topResult.errors) console.error("[api/admin/stats] top services errors:", topResult.errors);

    const ranked = ((topResult.data || []) as any[])
      .map((service) => ({
        _id: service._id,
        name: service.name,
        slug: service.slug,
        logo_url: service.logo_url,
        category: service.category as CategoryRecord | null,
        clicks: service._count?.clicks || 0,
      }))
      .sort((a, b) => b.clicks - a.clicks);

    const topServices = ranked.filter((service) => service.clicks > 0).slice(0, 10);

    const categoryTotals = new Map<string, { category: CategoryRecord | null; clicks: number }>();
    for (const service of ranked) {
      if (!service.clicks || !service.category) continue;
      const key = service.category._id;
      const entry = categoryTotals.get(key) || { category: service.category, clicks: 0 };
      entry.clicks += service.clicks;
      categoryTotals.set(key, entry);
    }
    const topCategories = Array.from(categoryTotals.values())
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 6);

    const recentResult = await totalumSdk.crud.query("clicks", {
      _sort: { clicked_at: "desc" },
      _limit: 20,
      service: true,
      user: true,
    });
    if (recentResult.errors) console.error("[api/admin/stats] recent clicks errors:", recentResult.errors);

    return NextResponse.json({
      ok: true,
      data: {
        servicesTotal: totalServices,
        servicesActive: readCount(servicesActive),
        usersTotal: readCount(usersTotal),
        views: totalViews,
        clicksTotal,
        clicksToday,
        clicksWeek,
        clicksMonth,
        withAffiliate: affiliateCount,
        withoutAffiliate: Math.max(totalServices - affiliateCount, 0),
        // CTR only makes sense once real page views exist.
        ctr: totalViews > 0 ? Number(((clicksTotal / totalViews) * 100).toFixed(2)) : null,
        topServices,
        topCategories,
        recentClicks: (recentResult.data || []) as unknown as ClickRecord[],
      },
    });
  } catch (err: any) {
    console.error("[api/admin/stats] error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
