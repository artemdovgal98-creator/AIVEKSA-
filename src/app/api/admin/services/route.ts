import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { totalumSdk } from "@/lib/totalum";
import { getServerLang } from "@/lib/i18n/server";
import { offerIsLive, setServicePartnerUrl, sortByPrimary } from "@/lib/offers";
import { FormError, parseServiceForm, servicePatchFromForm } from "@/lib/service-form";
import { logAdminAction } from "@/lib/audit";
import type { AffiliateOfferRecord, ServiceRecord } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * GET — every AI service for Admin → AI Catalog (inactive included), with the
 * partner data resolved from `affiliate_offers` (single source of truth).
 */
export async function GET(request: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || "").trim().slice(0, 100);
    const filter: Record<string, any> = {};
    if (q) {
      const regex = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter._or = ["name", "slug", "title_ru", "title_uk", "title_en"].map((field) => ({
        [field]: { regex, options: "i" },
      }));
    }

    const [result, offersResult] = await Promise.all([
      totalumSdk.crud.query("services", { _filter: filter, _sort: { createdAt: "desc" }, _limit: 1000, category: true }),
      totalumSdk.crud.query("affiliate_offers", { _limit: 2000, network: { _omit: { postback_secret: true } } }),
    ]);
    if (result.errors || offersResult.errors) {
      console.error("[api/admin/services] list errors:", result.errors || offersResult.errors);
      return NextResponse.json({ ok: false, error: "Failed to load services" }, { status: 500 });
    }

    const offersByService = new Map<string, AffiliateOfferRecord[]>();
    for (const offer of (offersResult.data || []) as unknown as AffiliateOfferRecord[]) {
      const id = offer.service && typeof offer.service === "object" ? offer.service._id : (offer.service as string);
      if (!id) continue;
      offersByService.set(id, [...(offersByService.get(id) || []), offer]);
    }

    const data = ((result.data || []) as unknown as ServiceRecord[]).map((service) => {
      const offers = sortByPrimary(offersByService.get(service._id) || []);
      const primary = offers[0];
      const network = primary?.network && typeof primary.network === "object" ? primary.network : null;
      return {
        ...service,
        partner_url: primary?.affiliate_url || "",
        partner_live: service.is_affiliate === "yes" && offers.some(offerIsLive),
        partner_status: primary?.status || null,
        partner_network: network?.slug || null,
        partner_slug: primary?.offer_slug || null,
        offers_count: offers.length,
      };
    });

    return NextResponse.json({ ok: true, data, total: data.length });
  } catch (err: any) {
    console.error("[api/admin/services] GET error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}

/** POST — create an AI service from the six-field form. */
export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

    const body = await request.json().catch(() => ({}));
    const input = parseServiceForm(body, "create");
    const lang = await getServerLang();
    const patch = await servicePatchFromForm(input, lang, null);

    const created = await totalumSdk.crud.createRecord("services", patch);
    if (created.errors) {
      console.error("[api/admin/services] create errors:", created.errors);
      return NextResponse.json({ ok: false, error: "Failed to create service" }, { status: 400 });
    }
    const id = String((created.data as any)?.insertedId || (created.data as any)?._id || "");
    if (input.partner_url) {
      await setServicePartnerUrl({ _id: id, slug: patch.slug, name: patch.name } as ServiceRecord, input.partner_url);
    }

    await logAdminAction(admin._id, "service.create", "services", id, { slug: patch.slug, partner: patch.is_affiliate });
    console.log("[api/admin/services] created", patch.slug, "by", admin._id);
    return NextResponse.json({ ok: true, data: { _id: id, slug: patch.slug } });
  } catch (err: any) {
    if (err instanceof FormError) {
      return NextResponse.json({ ok: false, error: err.message, field: err.field }, { status: 400 });
    }
    console.error("[api/admin/services] POST error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
