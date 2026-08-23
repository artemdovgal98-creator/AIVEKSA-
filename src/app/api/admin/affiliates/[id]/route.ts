import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { totalumSdk } from "@/lib/totalum";
import { buildAffiliatePayload } from "@/lib/admin-payload";

export const dynamic = "force-dynamic";

/**
 * PUT — saves the owner's own affiliate link (and status / notes) for a service.
 * Nothing else about the service is touched, and the link takes effect on the
 * public "Try it" button immediately: no code change, no redeploy.
 */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const payload = buildAffiliatePayload(body);

    if (payload.affiliate_url && !/^https?:\/\//i.test(payload.affiliate_url)) {
      return NextResponse.json(
        { ok: false, error: "Affiliate URL must start with http:// or https://" },
        { status: 400 }
      );
    }

    const updated = await totalumSdk.crud.editRecordById("services", id, payload);
    if (updated.errors) {
      console.error("[api/admin/affiliates] update errors:", updated.errors);
      return NextResponse.json({ ok: false, error: updated.errors }, { status: 400 });
    }

    console.log(
      `[api/admin/affiliates] ${id} affiliate_url=${payload.affiliate_url ? "set" : "cleared"} ` +
        `status=${payload.affiliate_status} by ${admin._id}`
    );
    return NextResponse.json({ ok: true, data: updated.data });
  } catch (err: any) {
    console.error("[api/admin/affiliates] PUT error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
