import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { totalumSdk } from "@/lib/totalum";
import { buildOfferPayload } from "@/lib/admin-payload";
import { logAdminAction } from "@/lib/audit";

export const dynamic = "force-dynamic";

const ID_RE = /^[a-f0-9]{24}$/i;

/** PUT — partial update from the Affiliate Marketplace. */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    if (!ID_RE.test(id)) return NextResponse.json({ ok: false, error: "Invalid id" }, { status: 400 });
    const current = await totalumSdk.crud.getRecordById("affiliate_offers", id);
    const offer = current.data as any;
    if (!offer) return NextResponse.json({ ok: false, error: "Offer not found" }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const { payload, error } = buildOfferPayload(body);
    if (error) return NextResponse.json({ ok: false, error }, { status: 400 });
    if (!Object.keys(payload).length) return NextResponse.json({ ok: false, error: "Nothing to update" }, { status: 400 });

    // Keeping `active` and `status` consistent: switching off = INACTIVE.
    if (payload.active === "no" && !payload.status) payload.status = "inactive";
    if (payload.status === "inactive" && !payload.active) payload.active = "no";
    if (payload.active === "yes" && !payload.status && offer.status === "inactive") payload.status = "tracking_unknown";

    const updated = await totalumSdk.crud.editRecordById("affiliate_offers", id, payload);
    if (updated.errors) {
      console.error("[api/admin/offers] update errors:", updated.errors);
      return NextResponse.json({ ok: false, error: "Failed to save offer" }, { status: 400 });
    }

    // Only one primary offer per service.
    const serviceId = payload.service !== undefined ? payload.service : typeof offer.service === "object" ? offer.service?._id : offer.service;
    if (payload.is_primary === "yes" && serviceId) {
      const siblings = await totalumSdk.crud.query("affiliate_offers", { _filter: { service: serviceId, _id: { ne: id } }, _limit: 50 });
      for (const sibling of (siblings.data || []) as any[]) {
        if (sibling.is_primary === "no") continue;
        const r = await totalumSdk.crud.editRecordById("affiliate_offers", sibling._id, { is_primary: "no" });
        if (r.errors) console.error("[api/admin/offers] failed to demote sibling", sibling._id, r.errors);
      }
    }

    await logAdminAction(admin._id, "offer.update", "affiliate_offers", id, payload);
    const fresh = await totalumSdk.crud.query("affiliate_offers", { _filter: { _id: id }, _limit: 1, network: { _omit: { postback_secret: true } }, service: true });
    return NextResponse.json({ ok: true, data: (fresh.data || [])[0] || null });
  } catch (err: any) {
    console.error("[api/admin/offers] PUT error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}

/**
 * DELETE — archives the offer (INACTIVE). Affiliate data, URLs and click
 * history are never destroyed from the admin panel.
 */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    if (!ID_RE.test(id)) return NextResponse.json({ ok: false, error: "Invalid id" }, { status: 400 });
    const archived = await totalumSdk.crud.editRecordById("affiliate_offers", id, { active: "no", status: "inactive" });
    if (archived.errors) {
      console.error("[api/admin/offers] archive errors:", archived.errors);
      return NextResponse.json({ ok: false, error: "Failed to archive offer" }, { status: 400 });
    }
    await logAdminAction(admin._id, "offer.archive", "affiliate_offers", id);
    return NextResponse.json({ ok: true, data: { id } });
  } catch (err: any) {
    console.error("[api/admin/offers] DELETE error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
