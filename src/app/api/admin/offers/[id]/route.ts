import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { totalumSdk } from "@/lib/totalum";
import { buildOfferPayload } from "@/lib/admin-payload";

export const dynamic = "force-dynamic";

/**
 * PUT — partial update. This is what the "save affiliate link" button next to
 * every offer calls, so the response must surface any database error.
 */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const payload = buildOfferPayload(body);

    if (!Object.keys(payload).length) {
      return NextResponse.json({ ok: false, error: "Nothing to update" }, { status: 400 });
    }

    const updated = await totalumSdk.crud.editRecordById("affiliate_offers", id, payload);
    if (updated.errors) {
      console.error("[api/admin/offers] update errors:", updated.errors);
      return NextResponse.json({ ok: false, error: updated.errors }, { status: 400 });
    }

    // Return the fresh record with its relations so the table can update in place.
    const fresh = await totalumSdk.crud.query("affiliate_offers", {
      _filter: { _id: id },
      _limit: 1,
      network: true,
      service: true,
    });
    console.log("[api/admin/offers] updated", id, Object.keys(payload).join(","), "by", admin._id);
    return NextResponse.json({ ok: true, data: (fresh.data || [])[0] || updated.data });
  } catch (err: any) {
    console.error("[api/admin/offers] PUT error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}

/** DELETE — remove an offer permanently. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const deleted = await totalumSdk.crud.deleteRecordById("affiliate_offers", id);
    if (deleted.errors) {
      console.error("[api/admin/offers] delete errors:", deleted.errors);
      return NextResponse.json({ ok: false, error: deleted.errors }, { status: 400 });
    }
    console.log("[api/admin/offers] deleted", id, "by", admin._id);
    return NextResponse.json({ ok: true, data: { id } });
  } catch (err: any) {
    console.error("[api/admin/offers] DELETE error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
