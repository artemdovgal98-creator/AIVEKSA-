import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { totalumSdk } from "@/lib/totalum";
import { readCount, readSum } from "@/lib/aggregate";
import { loadConversions, totalsFor, totalsByService, daysAgoIso } from "@/lib/earnings";
import { getLiveOfferServiceIds, loadOfferMetrics, revenueScalar } from "@/lib/offers";
import { isPaymentsConfigured } from "@/lib/billing";
import { addMoney, type Money } from "@/lib/money";
import { findSuspiciousClicks } from "@/lib/suspicious-clicks";
import { EARNED_STATUSES } from "@/lib/types";
import type { CategoryRecord, Currency } from "@/lib/types";

const refId = (value: any): string => (value && typeof value === "object" ? value._id : value) || "";
const pad = (n: number) => String(n).padStart(2, "0");
const keyOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dateKeyOfIso = (iso: string) => keyOf(new Date(iso));

export const dynamic = "force-dynamic";

/** Dashboard metrics — every number comes from real records, nothing is fabricated. */
export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

    const monthAgoIso = daysAgoIso(30);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const yesterdayStart = new Date(todayStart.getTime() - 86_400_000);
    const weekStart = new Date(Date.now() - 7 * 86_400_000);
    const monthStart = new Date(Date.now() - 30 * 86_400_000);

    const [
      servicesTotal,
      servicesActive,
      usersTotal,
      viewsSum,
      withAffiliate,
      clicksRows,
      conversions,
      suspicious,
    ] = await Promise.all([
      totalumSdk.crud.query("services", { _aggregate: { _count: true } }),
      totalumSdk.crud.query("services", { _filter: { active: "yes" }, _aggregate: { _count: true } }),
      totalumSdk.crud.query("user", { _aggregate: { _count: true } }),
      totalumSdk.crud.query("services", { _aggregate: { _sum: { views: true } } }),
      getLiveOfferServiceIds(),
      totalumSdk.crud.query("clicks", {
        _filter: { manual_entry: { ne: "yes" }, clicked_at: { gte: monthAgoIso } },
        _select: { clicked_at: true, session_id: true },
        _sort: { clicked_at: "desc" },
        _limit: 20000,
      }),
      loadConversions(),
      findSuspiciousClicks(monthAgoIso),
    ]);
    if (clicksRows.errors) console.error("[api/admin/stats] clicks errors:", clicksRows.errors);

    const totalServices = readCount(servicesTotal);
    const totalViews = readSum(viewsSum, "views");
    const affiliateCount = withAffiliate.size;

    // ---- Periods (today / yesterday / 7d / 30d) — clicks + unique sessions ----
    const perDay = new Map<string, { clicks: number; sessions: Set<string> }>();
    const sessSets = { today: new Set<string>(), yesterday: new Set<string>(), week: new Set<string>(), month: new Set<string>() };
    const counts = { today: 0, yesterday: 0, week: 0, month: 0 };

    for (const row of (clicksRows.data || []) as any[]) {
      const ts = Date.parse(row.clicked_at || "");
      if (!Number.isFinite(ts)) continue;
      const key = dateKeyOfIso(row.clicked_at);
      const bucket = perDay.get(key) || { clicks: 0, sessions: new Set<string>() };
      bucket.clicks += 1;
      const sid = row.session_id || "";
      if (sid) bucket.sessions.add(sid);
      perDay.set(key, bucket);

      if (ts >= todayStart.getTime()) {
        counts.today += 1;
        if (sid) sessSets.today.add(sid);
      } else if (ts >= yesterdayStart.getTime()) {
        counts.yesterday += 1;
        if (sid) sessSets.yesterday.add(sid);
      }
      if (ts >= weekStart.getTime()) {
        counts.week += 1;
        if (sid) sessSets.week.add(sid);
      }
      if (ts >= monthStart.getTime()) {
        counts.month += 1;
        if (sid) sessSets.month.add(sid);
      }
    }

    // ---- Revenue per day (approved commissions only) ----
    const revenueByDay = new Map<string, Money>();
    for (const row of conversions) {
      if (!EARNED_STATUSES.includes(row.conversion_status) || !row.clicked_at) continue;
      const key = dateKeyOfIso(row.clicked_at);
      const money = revenueByDay.get(key) || {};
      addMoney(money, row.currency, row.earned_amount);
      revenueByDay.set(key, money);
    }

    const daily = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(todayStart.getTime() - i * 86_400_000);
      const key = keyOf(d);
      const bucket = perDay.get(key);
      return {
        date: key,
        clicks: bucket?.clicks || 0,
        unique: bucket?.sessions.size || 0,
        revenue: revenueByDay.get(key) || {},
      };
    });

    const earnings = {
      allTime: totalsFor(conversions),
      week: totalsFor(conversions, daysAgoIso(7)),
      month: totalsFor(conversions, daysAgoIso(30)),
      entries: conversions.length,
    };

    // ---- Top 10 (services ranked by clicks, carrying real commission) ----
    const topResult = await totalumSdk.crud.query("services", {
      _limit: 300,
      _select: { name: true, title_ru: true, title_en: true, slug: true, logo_url: true },
      category: true,
      clicks: { _count: true, _include: false, _filter: { manual_entry: { ne: "yes" } } },
    });
    if (topResult.errors) console.error("[api/admin/stats] top services errors:", topResult.errors);

    const byServiceRevenue = totalsByService(conversions);
    const ranked = ((topResult.data || []) as any[]).map((service) => ({
      _id: service._id,
      name: service.name || service.title_ru || service.title_en || service.slug,
      slug: service.slug,
      logo_url: service.logo_url,
      category: service.category as CategoryRecord | null,
      clicks: service._count?.clicks || 0,
      revenue: byServiceRevenue.get(service._id)?.earned || {},
    }));

    const top10 = ranked
      .filter((s) => s.clicks > 0 || revenueScalar(s.revenue) > 0)
      .sort((a, b) => revenueScalar(b.revenue) - revenueScalar(a.revenue) || b.clicks - a.clicks)
      .slice(0, 10)
      .map((s) => ({ _id: s._id, name: s.name, slug: s.slug, logo_url: s.logo_url, clicks: s.clicks, revenue: s.revenue }));

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
      _limit: 10,
      service: true,
    });
    if (recentResult.errors) console.error("[api/admin/stats] recent clicks errors:", recentResult.errors);
    const recentClicks = ((recentResult.data || []) as any[]).map((click) => {
      const service = typeof click.service === "object" ? click.service : null;
      return {
        _id: click._id,
        name: service?.name || service?.title_ru || service?.title_en || service?.slug || "—",
        country: click.country || "",
        device: click.device || "",
        clicked_at: click.clicked_at || click.createdAt || "",
      };
    });

    // ---- Affiliate performance (EPC / CR for the Money card) ----
    const metrics = await loadOfferMetrics().catch((err) => {
      console.error("[api/admin/stats] offer metrics failed:", err);
      return new Map();
    });
    let affClicks = 0;
    let affConversions = 0;
    for (const m of metrics.values()) {
      affClicks += m.clicks;
      affConversions += m.conversions;
    }
    const affEpc: Money | null = affClicks
      ? Object.fromEntries(Object.entries(earnings.allTime.earned).map(([currency, value]) => [currency, Number(((value || 0) / affClicks).toFixed(4))]))
      : null;
    const affCr = affClicks ? Number(((affConversions / affClicks) * 100).toFixed(2)) : null;

    // ---- Payments — merged "recent payments" (shown only when data exists) ----
    const recentOrders = await totalumSdk.crud.query("orders", {
      _sort: { createdAt: "desc" },
      _limit: 8,
      user: true,
      plan: true,
    });
    if (recentOrders.errors) console.error("[api/admin/stats] recent orders errors:", recentOrders.errors);
    const payments = ((recentOrders.data || []) as any[]).map((order) => ({
      _id: order._id,
      order_number: order.order_number,
      amount: order.amount,
      currency: order.currency,
      status: order.status,
      date: order.paid_at || order.createdAt,
      user: order.user?.email || null,
      plan: order.plan?.name || null,
    }));

    // ---- Active users (sessions touched in the last 30 days) ----
    const sessions = await totalumSdk.crud.query("session", { _filter: { updatedAt: { gte: monthAgoIso } }, _limit: 5000 });
    const activeUserIds = new Set(((sessions.data || []) as any[]).map((row) => refId(row.user_id)).filter(Boolean));

    return NextResponse.json({
      ok: true,
      data: {
        paymentsConfigured: await isPaymentsConfigured(),
        usersTotal: readCount(usersTotal),
        activeUsers: activeUserIds.size,
        views: totalViews,
        servicesTotal: totalServices,
        servicesActive: readCount(servicesActive),
        withAffiliate: affiliateCount,
        withoutAffiliate: Math.max(totalServices - affiliateCount, 0),
        periods: {
          today: { clicks: counts.today, unique: sessSets.today.size },
          yesterday: { clicks: counts.yesterday, unique: sessSets.yesterday.size },
          week: { clicks: counts.week, unique: sessSets.week.size },
          month: { clicks: counts.month, unique: sessSets.month.size },
        },
        daily,
        money: {
          revenue: earnings.allTime.earned,
          pending: earnings.allTime.pending,
          conversions: affConversions,
          epc: affEpc,
          cr: affCr,
        },
        top10,
        topCategories,
        recentClicks,
        suspicious,
        payments,
      },
    });
  } catch (err: any) {
    console.error("[api/admin/stats] error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
