import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { totalumSdk } from "@/lib/totalum";
import { loadConversions, totalsFor } from "@/lib/earnings";
import { isCurrency } from "@/lib/money";
import { logAdminAction } from "@/lib/audit";
import { CONVERSION_STATUSES, type ConversionStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

/** GET /api/admin/earnings?service=<id> — commission entries of one AI service. */
export async function GET(request: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const serviceId = (searchParams.get("service") || "").trim();
    if (!serviceId) return NextResponse.json({ ok: false, error: "service is required" }, { status: 400 });

    const rows = await loadConversions(serviceId);
    return NextResponse.json({ ok: true, data: { entries: rows, totals: totalsFor(rows) } });
  } catch (err: any) {
    console.error("[api/admin/earnings] GET error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}

/**
 * POST — records a commission the affiliate network actually reported.
 * Stored on the clicks table (as the owner asked) but flagged `manual_entry`
 * so it never pollutes the real visitor-click counters.
 */
export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

    const body = (await request.json().catch(() => ({}))) as any;
    let serviceId = typeof body.service === "string" ? body.service.trim() : "";
    const offerId = typeof body.offer === "string" && /^[a-f0-9]{24}$/i.test(body.offer.trim()) ? body.offer.trim() : "";
    if (offerId && !serviceId) {
      const offer = await totalumSdk.crud.getRecordById("affiliate_offers", offerId);
      const ref = (offer.data as any)?.service;
      serviceId = (ref && typeof ref === "object" ? ref._id : ref) || "";
    }
    const amount = Number(body.earned_amount);
    const currency = isCurrency(body.currency) ? body.currency : "usd";
    const status: ConversionStatus = CONVERSION_STATUSES.includes(body.conversion_status)
      ? body.conversion_status
      : "confirmed";

    if (!serviceId && !offerId) return NextResponse.json({ ok: false, error: "service or offer is required" }, { status: 400 });
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ ok: false, error: "earned_amount must be a positive number" }, { status: 400 });
    }

    const clickedAt = typeof body.clicked_at === "string" && body.clicked_at
      ? new Date(body.clicked_at).toISOString()
      : new Date().toISOString();

    const created = await totalumSdk.crud.createRecord("clicks", {
      ...(serviceId ? { service: serviceId } : {}),
      ...(offerId ? { offer: offerId } : {}),
      clicked_at: clickedAt,
      affiliate_click: "yes",
      manual_entry: "yes",
      earned_amount: Number(amount.toFixed(2)),
      currency,
      conversion_status: status,
    });
    if (created.errors) {
      console.error("[api/admin/earnings] create errors:", created.errors);
      return NextResponse.json({ ok: false, error: created.errors }, { status: 400 });
    }

    await logAdminAction(admin._id, "conversion.report", "clicks", String((created.data as any)?.insertedId || ""), {
      service: serviceId,
      offer: offerId,
      amount,
      currency,
      status,
    });
    console.log(`[api/admin/earnings] +${amount} ${currency} (${status}) for service ${serviceId} by ${admin._id}`);
    return NextResponse.json({ ok: true, data: created.data });
  } catch (err: any) {
    console.error("[api/admin/earnings] POST error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
