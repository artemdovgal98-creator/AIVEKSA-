import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { totalumSdk } from "@/lib/totalum";
import { buildOfferPayload } from "@/lib/admin-payload";
import { uniqueOfferSlug } from "@/lib/offers";
import { logAdminAction } from "@/lib/audit";

export const dynamic = "force-dynamic";

/** GET — raw offer list (network + service expanded). The marketplace view uses /api/admin/marketplace. */
export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    const result = await totalumSdk.crud.query("affiliate_offers", {
      _sort: { order_position: "asc" },
      _limit: 2000,
      network: true,
      service: true,
    });
    if (result.errors) {
      console.error("[api/admin/offers] list errors:", result.errors);
      return NextResponse.json({ ok: false, error: "Failed to load offers" }, { status: 500 });
    }
    return NextResponse.json({ ok: true, data: result.data || [], total: (result.data || []).length });
  } catch (err: any) {
    console.error("[api/admin/offers] GET error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}

/** POST — add a new offer (any network, optionally bound to an AI service). */
export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

    const body = await request.json().catch(() => ({}));
    const { payload, error } = buildOfferPayload(body);
    if (error) return NextResponse.json({ ok: false, error }, { status: 400 });
    if (!payload.offer_name) return NextResponse.json({ ok: false, error: "Offer name is required" }, { status: 400 });
    if (!payload.network) return NextResponse.json({ ok: false, error: "Network is required" }, { status: 400 });

    const network = await totalumSdk.crud.getRecordById("affiliate_networks", payload.network);
    const networkSlug = (network.data as any)?.slug || "offer";
    payload.offer_slug = await uniqueOfferSlug(`${networkSlug}-${payload.offer_name}`);
    payload.active ??= "yes";
    payload.status ??= payload.affiliate_url ? "tracking_unknown" : "needs_review";
    payload.sponsored ??= "no";
    if (payload.service) {
      const existing = await totalumSdk.crud.query("affiliate_offers", { _filter: { service: payload.service }, _limit: 1 });
      payload.is_primary ??= (existing.data || []).length ? "no" : "yes";
    } else payload.is_primary ??= "no";

    const created = await totalumSdk.crud.createRecord("affiliate_offers", payload);
    if (created.errors) {
      console.error("[api/admin/offers] create errors:", created.errors);
      return NextResponse.json({ ok: false, error: "Failed to create offer" }, { status: 400 });
    }
    const id = String((created.data as any)?.insertedId || "");
    await logAdminAction(admin._id, "offer.create", "affiliate_offers", id, { name: payload.offer_name, network: networkSlug });
    return NextResponse.json({ ok: true, data: { _id: id, offer_slug: payload.offer_slug } });
  } catch (err: any) {
    console.error("[api/admin/offers] POST error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
