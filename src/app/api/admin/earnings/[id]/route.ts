import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { totalumSdk } from "@/lib/totalum";
import { isCurrency } from "@/lib/money";
import { CONVERSION_STATUSES, type ConversionStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

/** PUT — update the amount / currency / payment status of one commission entry. */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as any;
    const amount = Number(body.earned_amount);
    if (!Number.isFinite(amount) || amount < 0) {
      return NextResponse.json({ ok: false, error: "earned_amount must be a number >= 0" }, { status: 400 });
    }
    const status: ConversionStatus = CONVERSION_STATUSES.includes(body.conversion_status)
      ? body.conversion_status
      : "confirmed";

    const updated = await totalumSdk.crud.editRecordById("clicks", id, {
      earned_amount: Number(amount.toFixed(2)),
      currency: isCurrency(body.currency) ? body.currency : "usd",
      conversion_status: status,
    });
    if (updated.errors) {
      console.error("[api/admin/earnings] update errors:", updated.errors);
      return NextResponse.json({ ok: false, error: updated.errors }, { status: 400 });
    }

    console.log(`[api/admin/earnings] ${id} -> ${amount} (${status}) by ${admin._id}`);
    return NextResponse.json({ ok: true, data: updated.data });
  } catch (err: any) {
    console.error("[api/admin/earnings] PUT error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}

/**
 * DELETE — removes a commission. A manually added entry is deleted outright;
 * a commission attached to a real visitor click only loses its money fields,
 * because the click itself really happened and must stay in the statistics.
 */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const existing = await totalumSdk.crud.getRecordById("clicks", id);
    if (existing.errors) {
      console.error("[api/admin/earnings] read errors:", existing.errors);
      return NextResponse.json({ ok: false, error: existing.errors }, { status: 400 });
    }

    const record = existing.data as any;
    if (record?.manual_entry === "yes") {
      const removed = await totalumSdk.crud.deleteRecordById("clicks", id);
      if (removed.errors) {
        console.error("[api/admin/earnings] delete errors:", removed.errors);
        return NextResponse.json({ ok: false, error: removed.errors }, { status: 400 });
      }
    } else {
      const cleared = await totalumSdk.crud.editRecordById("clicks", id, {
        earned_amount: null,
        conversion_status: null,
        currency: null,
      });
      if (cleared.errors) {
        console.error("[api/admin/earnings] clear errors:", cleared.errors);
        return NextResponse.json({ ok: false, error: cleared.errors }, { status: 400 });
      }
    }

    console.log(`[api/admin/earnings] removed commission ${id} by ${admin._id}`);
    return NextResponse.json({ ok: true, data: { _id: id } });
  } catch (err: any) {
    console.error("[api/admin/earnings] DELETE error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
