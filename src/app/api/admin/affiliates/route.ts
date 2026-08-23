import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { totalumSdk } from "@/lib/totalum";
import { readCount } from "@/lib/aggregate";
import type { CategoryRecord, ServiceRecord } from "@/lib/types";

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

/** Counts real affiliate clicks only — never estimated, never fabricated. */
async function countAffiliateClicks(sinceIso?: string): Promise<number> {
  const filter: Record<string, any> = { affiliate_click: "yes" };
  if (sinceIso) filter.clicked_at = { gte: sinceIso };
  const result = await totalumSdk.crud.query("clicks", { _filter: filter, _aggregate: { _count: true } });
  if (result.errors) console.error("[api/admin/affiliates] click count errors:", result.errors);
  return readCount(result);
}

/**
 * Affiliate Manager data: every service with its affiliate fields plus the real
 * click count taken from the database (aggregated by Totalum, no N+1 loop).
 */
export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

    const result = await totalumSdk.crud.query("services", {
      _sort: { name: "asc" },
      _limit: 500,
      category: true,
      clicks: { _count: true, _include: false },
    });
    if (result.errors) console.error("[api/admin/affiliates] list errors:", result.errors);

    const services = ((result.data || []) as any[]).map((service) => ({
      _id: service._id,
      name: service.name,
      slug: service.slug,
      logo_url: service.logo_url,
      category: (service.category || null) as CategoryRecord | null,
      official_url: service.official_url || "",
      affiliate_url: service.affiliate_url || "",
      affiliate_program_url: service.affiliate_program_url || "",
      affiliate_network: service.affiliate_network || "",
      commission: service.commission || "",
      affiliate_status: service.affiliate_status || "not_connected",
      affiliate_notes: service.affiliate_notes || "",
      is_affiliate: service.is_affiliate || "no",
      active: service.active || "yes",
      views: service.views || 0,
      clicks: service._count?.clicks || 0,
    }));

    const [affiliateTotal, affiliateToday, affiliateWeek, affiliateMonth] = await Promise.all([
      countAffiliateClicks(),
      countAffiliateClicks(startOfTodayIso()),
      countAffiliateClicks(daysAgoIso(7)),
      countAffiliateClicks(daysAgoIso(30)),
    ]);

    const ranked = [...services].sort((a, b) => b.clicks - a.clicks);
    const topServices = ranked.filter((service) => service.clicks > 0).slice(0, 10);

    const categoryTotals = new Map<string, { category: CategoryRecord | null; clicks: number }>();
    for (const service of ranked) {
      if (!service.clicks || !service.category) continue;
      const entry = categoryTotals.get(service.category._id) || { category: service.category, clicks: 0 };
      entry.clicks += service.clicks;
      categoryTotals.set(service.category._id, entry);
    }

    return NextResponse.json({
      ok: true,
      data: {
        services,
        stats: {
          affiliateTotal,
          affiliateToday,
          affiliateWeek,
          affiliateMonth,
          withProgram: services.filter((service) => Boolean(service.affiliate_program_url)).length,
          withoutUrl: services.filter((service) => !service.affiliate_url).length,
          connected: services.filter((service) => service.affiliate_status === "connected").length,
          topServices,
          topCategories: Array.from(categoryTotals.values())
            .sort((a, b) => b.clicks - a.clicks)
            .slice(0, 6),
        },
      },
      total: services.length,
    });
  } catch (err: any) {
    console.error("[api/admin/affiliates] GET error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
