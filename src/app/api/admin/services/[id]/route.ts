import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { totalumSdk } from "@/lib/totalum";
import { buildServicePayload } from "@/lib/admin-payload";
import { syncServiceOffers } from "@/lib/offers";

export const dynamic = "force-dynamic";

/** PUT — full update (also used by the activate / deactivate switches). */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const payload = buildServicePayload(body);

    const updated = await totalumSdk.crud.editRecordById("services", id, payload);
    if (updated.errors) {
      console.error("[api/admin/services] update errors:", updated.errors);
      return NextResponse.json({ ok: false, error: updated.errors }, { status: 400 });
    }
    // The affiliate link lives on the service card now — push it to the offers
    // bound to this service so the public offer wall stays in sync.
    if (typeof payload.affiliate_url === "string" && payload.affiliate_url) {
      await syncServiceOffers(id, payload.affiliate_url);
    }

    console.log("[api/admin/services] updated", id, "by", admin._id);
    return NextResponse.json({ ok: true, data: updated.data });
  } catch (err: any) {
    console.error("[api/admin/services] PUT error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}

/** DELETE — remove a record permanently. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const deleted = await totalumSdk.crud.deleteRecordById("services", id);
    if (deleted.errors) {
      console.error("[api/admin/services] delete errors:", deleted.errors);
      return NextResponse.json({ ok: false, error: deleted.errors }, { status: 400 });
    }
    console.log("[api/admin/services] deleted", id, "by", admin._id);
    return NextResponse.json({ ok: true, data: { id } });
  } catch (err: any) {
    console.error("[api/admin/services] DELETE error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
