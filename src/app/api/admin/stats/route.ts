import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { totalumSdk } from "@/lib/totalum";
import { readCount, readSum } from "@/lib/aggregate";
import { loadConversions, totalsFor } from "@/lib/earnings";
import { getLiveOfferServiceIds, loadOfferMetrics, revenueScalar, epcOf, crOf } from "@/lib/offers";
import { isPaymentsConfigured } from "@/lib/billing";
import type { CategoryRecord, ClickRecord, Currency } from "@/lib/types";

const refId = (value: any): string => (value && typeof value === "object" ? value._id : value) || "";

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
  // manual_entry === "yes" marks a commission recorded by the owner / a webhook,
  // not a real visitor click — it must never be counted as traffic.
  const filter: Record<string, any> = { manual_entry: { ne: "yes" } };
  if (iso) filter.clicked_at = { gte: iso };
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
      // Affiliate services = services whose partner link is ON and backed by a live offer.
      getLiveOfferServiceIds(),
      countClicksSince(),
      countClicksSince(startOfTodayIso()),
      countClicksSince(daysAgoIso(7)),
      countClicksSince(daysAgoIso(30)),
    ]);

    // Real commissions reported for these services (nothing estimated).
    const conversions = await loadConversions();
    const earnings = {
      allTime: totalsFor(conversions),
      week: totalsFor(conversions, daysAgoIso(7)),
      month: totalsFor(conversions, daysAgoIso(30)),
      entries: conversions.length,
    };

    const totalServices = readCount(servicesTotal);
    const totalViews = readSum(viewsSum, "views");
    const affiliateCount = withAffiliate.size;

    // Per-service click counts, computed by the database (no N+1 loop).
    const topResult = await totalumSdk.crud.query("services", {
      _limit: 300,
      _select: { name: true, title_ru: true, title_en: true, slug: true, logo_url: true },
      category: true,
      clicks: { _count: true, _include: false, _filter: { manual_entry: { ne: "yes" } } },
    });
    if (topResult.errors) console.error("[api/admin/stats] top services errors:", topResult.errors);

    const ranked = ((topResult.data || []) as any[])
      .map((service) => ({
        _id: service._id,
        name: service.name || service.title_ru || service.title_en || service.slug,
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
      _filter: { manual_entry: { ne: "yes" } },
      _sort: { clicked_at: "desc" },
      _limit: 20,
      service: true,
      user: true,
    });
    if (recentResult.errors) console.error("[api/admin/stats] recent clicks errors:", recentResult.errors);

    // ---- Billing (real orders / subscriptions only) ----
    const monthAgo = daysAgoIso(30);
    const [sessions, activeSubs, ordersAll, ordersPaid, paidByCurrency, recentPayments, failedPayments, subsByPlan, plans] =
      await Promise.all([
        totalumSdk.crud.query("session", { _filter: { updatedAt: { gte: monthAgo } }, _limit: 5000 }),
        totalumSdk.crud.query("subscriptions", {
          _filter: { status: { in: ["active", "paid"] }, end_date: { gte: new Date().toISOString() } },
          _aggregate: { _count: true },
        }),
        totalumSdk.crud.query("orders", { _aggregate: { _count: true } }),
        totalumSdk.crud.query("orders", { _filter: { status: "paid" }, _aggregate: { _count: true } }),
        totalumSdk.crud.query("orders", { _filter: { status: "paid" }, _groupBy: "currency", _aggregate: { _sum: { amount: true } }, _limit: 10 }),
        totalumSdk.crud.query("orders", { _filter: { status: "paid" }, _sort: { paid_at: "desc" }, _limit: 8, user: true, plan: true }),
        totalumSdk.crud.query("orders", { _filter: { status: "failed" }, _sort: { createdAt: "desc" }, _limit: 8, user: true, plan: true }),
        totalumSdk.crud.query("orders", { _filter: { status: "paid" }, _groupBy: "plan", _aggregate: { _count: true, _sum: { amount: true } }, _limit: 50 }),
        totalumSdk.crud.query("plans", { _limit: 50 }),
      ]);
    const activeUserIds = new Set(((sessions.data || []) as any[]).map((row) => refId(row.user_id)).filter(Boolean));
    const revenue: Partial<Record<Currency, number>> = {};
    for (const row of (paidByCurrency.data || []) as any[]) {
      const currency = (row._group?.currency || "usd") as Currency;
      revenue[currency] = Number(row._aggregate?._sum?.amount) || 0;
    }
    const planNames = new Map(((plans.data || []) as any[]).map((plan) => [plan._id, plan.name]));
    const topPlans = ((subsByPlan.data || []) as any[])
      .map((row) => ({ name: planNames.get(refId(row._group?.plan)) || "—", orders: Number(row._aggregate?._count) || 0 }))
      .sort((a, b) => b.orders - a.orders)
      .slice(0, 5);
    const slimOrder = (order: any) => ({
      _id: order._id,
      order_number: order.order_number,
      amount: order.amount,
      currency: order.currency,
      status: order.status,
      date: order.paid_at || order.createdAt,
      user: order.user?.email || null,
      plan: order.plan?.name || null,
    });

    // ---- Affiliate Marketplace (clicks attributed to offers) ----
    const metrics = await loadOfferMetrics().catch((err) => {
      console.error("[api/admin/stats] offer metrics failed:", err);
      return new Map();
    });
    let affClicks = 0;
    let affConversions = 0;
    const affRevenue: Partial<Record<Currency, number>> = {};
    for (const m of metrics.values()) {
      affClicks += m.clicks;
      affConversions += m.conversions;
      for (const [currency, value] of Object.entries(m.revenue)) {
        affRevenue[currency as Currency] = (affRevenue[currency as Currency] || 0) + (Number(value) || 0);
      }
    }
    const offerIds = Array.from(metrics.entries())
      .filter(([, m]) => m.clicks > 0 || m.conversions > 0)
      .sort((a, b) => revenueScalar(b[1].revenue) - revenueScalar(a[1].revenue) || b[1].clicks - a[1].clicks)
      .slice(0, 8);
    const offerRows = offerIds.length
      ? await totalumSdk.crud.query("affiliate_offers", { _filter: { _id: { in: offerIds.map(([id]) => id) } }, _limit: 8, network: true })
      : { data: [] as any[] };
    const offerById = new Map(((offerRows.data || []) as any[]).map((offer) => [offer._id, offer]));
    const topOffers = offerIds.map(([id, m]) => ({
      _id: id,
      name: offerById.get(id)?.offer_name || "—",
      network: offerById.get(id)?.network?.name || null,
      clicks: m.clicks,
      conversions: m.conversions,
      revenue: m.revenue,
      epc: epcOf(m),
      cr: crOf(m),
    }));

    return NextResponse.json({
      ok: true,
      data: {
        paymentsConfigured: isPaymentsConfigured(),
        activeUsers: activeUserIds.size,
        activeSubscriptions: readCount(activeSubs),
        ordersTotal: readCount(ordersAll),
        ordersPaid: readCount(ordersPaid),
        revenue,
        topPlans,
        recentPayments: ((recentPayments.data || []) as any[]).map(slimOrder),
        failedPayments: ((failedPayments.data || []) as any[]).map(slimOrder),
        affiliate: {
          services: affiliateCount,
          clicks: affClicks,
          conversions: affConversions,
          revenue: affRevenue,
          // EPC per currency — currencies are never summed.
          epc: affClicks
            ? Object.fromEntries(Object.entries(affRevenue).map(([currency, value]) => [currency, Number(((value || 0) / affClicks).toFixed(4))]))
            : null,
          cr: affClicks ? Number(((affConversions / affClicks) * 100).toFixed(2)) : null,
          ctr: totalViews > 0 ? Number(((affClicks / totalViews) * 100).toFixed(2)) : null,
        },
        topOffers,
        servicesTotal: totalServices,
        servicesActive: readCount(servicesActive),
        usersTotal: readCount(usersTotal),
        views: totalViews,
        clicksTotal,
        clicksToday,
        clicksWeek,
        clicksMonth,
        earnings,
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
