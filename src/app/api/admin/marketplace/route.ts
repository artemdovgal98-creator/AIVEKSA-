import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { totalumSdk } from "@/lib/totalum";
import { crOf, epcOf, loadOfferMetrics, offerIsLive, revenueScalar } from "@/lib/offers";
import { mergeMoney, type Money } from "@/lib/money";
import { getRankingWeights, normalizeWeights, RANKING_WEIGHTS_KEY, upsertSetting } from "@/lib/settings";
import { logAdminAction } from "@/lib/audit";
import { pickLocalized } from "@/lib/localize";
import { getServerLang } from "@/lib/i18n/server";
import type { AffiliateNetworkRecord, AffiliateOfferRecord, ServiceRecord } from "@/lib/types";

export const dynamic = "force-dynamic";

function sinceFor(range: string | null): string | undefined {
  const days = range === "7" ? 7 : range === "30" ? 30 : 0;
  if (!days) return undefined;
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

/**
 * GET /api/admin/marketplace?range=all|30|7
 * Offers with REAL metrics (clicks, conversions, revenue, EPC, CR, CTR),
 * per-network aggregates, health counters and the ranking weights.
 * Every number is derived from stored click / conversion records.
 */
export async function GET(request: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range");
    const lang = await getServerLang();

    const [offersResult, networksResult, metrics, weights] = await Promise.all([
      totalumSdk.crud.query("affiliate_offers", { _sort: { order_position: "asc" }, _limit: 2000, network: { _omit: { postback_secret: true } }, service: true }),
      totalumSdk.crud.query("affiliate_networks", { _sort: { order_position: "asc" }, _limit: 50 }),
      loadOfferMetrics(sinceFor(range)),
      getRankingWeights(),
    ]);
    if (offersResult.errors || networksResult.errors) {
      console.error("[api/admin/marketplace] query errors:", offersResult.errors || networksResult.errors);
      return NextResponse.json({ ok: false, error: "Failed to load marketplace" }, { status: 500 });
    }

    const offers = ((offersResult.data || []) as unknown as AffiliateOfferRecord[]).map((offer) => {
      const m = metrics.get(offer._id) || { clicks: 0, conversions: 0, pendingConversions: 0, revenue: {} };
      const network = offer.network && typeof offer.network === "object" ? (offer.network as AffiliateNetworkRecord) : null;
      const service = offer.service && typeof offer.service === "object" ? (offer.service as ServiceRecord) : null;
      const views = Number(service?.views) || 0;
      return {
        _id: offer._id,
        offer_name: offer.offer_name,
        external_id: offer.external_id || "",
        offer_slug: offer.offer_slug || "",
        affiliate_url: offer.affiliate_url || "",
        tracking_url: offer.tracking_url || "",
        status: offer.status || (offer.active === "no" ? "inactive" : "needs_review"),
        active: offer.active || "yes",
        live: offerIsLive(offer) && service?.is_affiliate === "yes",
        is_primary: offer.is_primary || "no",
        sponsored: offer.sponsored || "no",
        payout: typeof offer.payout === "number" ? offer.payout : null,
        payout_model: offer.payout_model || "other",
        quality_score: typeof offer.quality_score === "number" ? offer.quality_score : null,
        last_checked_at: offer.last_checked_at || null,
        health_note: offer.health_note || "",
        notes: offer.notes || "",
        network: network ? { _id: network._id, name: network.name, slug: network.slug, accent_color: network.accent_color || "" } : null,
        service: service
          ? {
              _id: service._id,
              slug: service.slug,
              title: pickLocalized(service, "title", lang) || service.name || service.slug,
              is_affiliate: service.is_affiliate || "no",
              views,
            }
          : null,
        metrics: {
          clicks: m.clicks,
          conversions: m.conversions,
          pending: m.pendingConversions,
          revenue: m.revenue,
          epc: epcOf(m),
          cr: crOf(m),
          // CTR = outbound clicks / real page views of the bound AI page (N/A without views).
          ctr: views > 0 ? m.clicks / views : null,
          revenueScalar: revenueScalar(m.revenue),
        },
      };
    });

    const networks = ((networksResult.data || []) as unknown as AffiliateNetworkRecord[]).map((network) => {
      const own = offers.filter((offer) => offer.network?._id === network._id);
      const revenue: Money = {};
      let clicks = 0;
      let conversions = 0;
      for (const offer of own) {
        clicks += offer.metrics.clicks;
        conversions += offer.metrics.conversions;
        mergeMoney(revenue, offer.metrics.revenue);
      }
      return {
        _id: network._id,
        name: network.name,
        slug: network.slug,
        accent_color: network.accent_color || "",
        website: network.website || "",
        active: network.active || "yes",
        subid_param: network.subid_param || "",
        postbackConfigured: Boolean(String(network.postback_secret || "").trim()),
        offers: own.length,
        live: own.filter((offer) => offer.live).length,
        clicks,
        conversions,
        revenue,
        cr: clicks ? conversions / clicks : null,
      };
    });

    const totals = { clicks: 0, conversions: 0, pending: 0, views: 0, revenue: {} as Money };
    const seenServices = new Set<string>();
    for (const offer of offers) {
      totals.clicks += offer.metrics.clicks;
      totals.conversions += offer.metrics.conversions;
      totals.pending += offer.metrics.pending;
      mergeMoney(totals.revenue, offer.metrics.revenue);
      if (offer.service && !seenServices.has(offer.service._id)) {
        seenServices.add(offer.service._id);
        totals.views += offer.service.views;
      }
    }
    const epc: Money = {};
    if (totals.clicks) for (const [c, v] of Object.entries(totals.revenue)) epc[c as keyof Money] = Number(((v || 0) / totals.clicks).toFixed(4));

    const summary = {
      offers: offers.length,
      live: offers.filter((offer) => offer.live).length,
      services: seenServices.size,
      needsReview: offers.filter((offer) => offer.status === "needs_review").length,
      broken: offers.filter((offer) => offer.status === "broken").length,
      sponsored: offers.filter((offer) => offer.sponsored === "yes").length,
      clicks: totals.clicks,
      conversions: totals.conversions,
      pending: totals.pending,
      revenue: totals.revenue,
      epc: totals.clicks ? epc : null,
      cr: totals.clicks ? totals.conversions / totals.clicks : null,
      ctr: totals.views ? totals.clicks / totals.views : null,
    };

    console.log(`[api/admin/marketplace] ${offers.length} offers, ${networks.length} networks, range=${range || "all"}`);
    return NextResponse.json({ ok: true, data: { offers, networks, summary, weights } });
  } catch (err: any) {
    console.error("[api/admin/marketplace] GET error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}

/** PUT — save the ranking weights (percent, each 0–100). */
export async function PUT(request: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    const body = (await request.json().catch(() => ({}))) as any;
    const weights = normalizeWeights(body?.weights);
    if (weights.relevance < weights.payout) {
      return NextResponse.json({ ok: false, error: "Relevance weight must be greater than payout weight" }, { status: 400 });
    }
    await upsertSetting(RANKING_WEIGHTS_KEY, JSON.stringify(weights), "Affiliate ranking weights (percent)");
    await logAdminAction(admin._id, "marketplace.weights", "admin_settings", RANKING_WEIGHTS_KEY, weights);
    return NextResponse.json({ ok: true, data: weights });
  } catch (err: any) {
    console.error("[api/admin/marketplace] PUT error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
