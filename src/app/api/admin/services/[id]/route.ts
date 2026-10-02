import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { totalumSdk } from "@/lib/totalum";
import { getServerLang } from "@/lib/i18n/server";
import { setServicePartnerUrl } from "@/lib/offers";
import { FormError, parseServiceForm, servicePatchFromForm } from "@/lib/service-form";
import { logAdminAction } from "@/lib/audit";
import type { ServiceRecord } from "@/lib/types";

export const dynamic = "force-dynamic";

const ID_RE = /^[a-f0-9]{24}$/i;

async function loadService(id: string): Promise<ServiceRecord | null> {
  const result = await totalumSdk.crud.getRecordById("services", id);
  if (result.errors) return null;
  return (result.data as unknown as ServiceRecord) || null;
}

/** PUT — save the six-field form (or the quick active switch). */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    if (!ID_RE.test(id)) return NextResponse.json({ ok: false, error: "Invalid id" }, { status: 400 });
    const existing = await loadService(id);
    if (!existing) return NextResponse.json({ ok: false, error: "Service not found" }, { status: 404 });

    const body = (await request.json().catch(() => ({}))) as Record<string, any>;
    const input = parseServiceForm(body, "update");
    const patch = await servicePatchFromForm(input, await getServerLang(), existing);
    if (body.active === "yes" || body.active === "no") patch.active = body.active;

    if (Object.keys(patch).length) {
      const updated = await totalumSdk.crud.editRecordById("services", id, patch);
      if (updated.errors) {
        console.error("[api/admin/services] update errors:", updated.errors);
        return NextResponse.json({ ok: false, error: "Failed to save service" }, { status: 400 });
      }
    }
    if (typeof input.partner_url === "string") await setServicePartnerUrl(existing, input.partner_url);

    await logAdminAction(admin._id, "service.update", "services", id, { fields: Object.keys(body) });
    console.log("[api/admin/services] updated", id, Object.keys(body).join(","), "by", admin._id);
    return NextResponse.json({ ok: true, data: { _id: id } });
  } catch (err: any) {
    if (err instanceof FormError) {
      return NextResponse.json({ ok: false, error: err.message, field: err.field }, { status: 400 });
    }
    console.error("[api/admin/services] PUT error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}

/**
 * DELETE — removes one AI service after the admin confirmed it. Its affiliate
 * offers are NOT deleted: they are unbound and flagged for review, so no
 * affiliate data or tracking history is lost.
 */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    if (!ID_RE.test(id)) return NextResponse.json({ ok: false, error: "Invalid id" }, { status: 400 });
    const existing = await loadService(id);
    if (!existing) return NextResponse.json({ ok: false, error: "Service not found" }, { status: 404 });

    const offers = await totalumSdk.crud.query("affiliate_offers", { _filter: { service: id }, _limit: 100 });
    for (const offer of (offers.data || []) as any[]) {
      const unbound = await totalumSdk.crud.editRecordById("affiliate_offers", offer._id, {
        service: null,
        status: "needs_review",
        notes: `${offer.notes || ""}\nService "${existing.slug}" deleted ${new Date().toISOString().slice(0, 10)}`.trim(),
      });
      if (unbound.errors) {
        console.error("[api/admin/services] offer unbind failed:", unbound.errors);
        return NextResponse.json({ ok: false, error: "Failed to unbind affiliate offers" }, { status: 500 });
      }
    }

    const deleted = await totalumSdk.crud.deleteRecordById("services", id);
    if (deleted.errors) {
      console.error("[api/admin/services] delete errors:", deleted.errors);
      return NextResponse.json({ ok: false, error: "Failed to delete service" }, { status: 400 });
    }
    await logAdminAction(admin._id, "service.delete", "services", id, {
      slug: existing.slug,
      name: existing.name || existing.title_ru,
      offersUnbound: (offers.data || []).length,
    });
    console.log("[api/admin/services] deleted", id, "by", admin._id);
    return NextResponse.json({ ok: true, data: { id } });
  } catch (err: any) {
    console.error("[api/admin/services] DELETE error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
