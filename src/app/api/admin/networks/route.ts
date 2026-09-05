import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { totalumSdk } from "@/lib/totalum";

export const dynamic = "force-dynamic";

/**
 * GET — the three affiliate networks with live offer counters, so the admin
 * tabs can show "CrakRevenue 12/49" without loading every offer twice.
 */
export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

    const networks = await totalumSdk.crud.query("affiliate_networks", {
      _sort: { order_position: "asc" },
      _limit: 50,
    });
    if (networks.errors) {
      console.error("[api/admin/networks] list errors:", networks.errors);
      return NextResponse.json({ ok: false, error: networks.errors }, { status: 400 });
    }

    const offers = await totalumSdk.crud.query("affiliate_offers", {
      _limit: 2000,
      _select: { network: true, affiliate_url: true, service: true, active: true },
    });
    const rows = (offers.data || []) as any[];

    const data = ((networks.data || []) as any[]).map((network) => {
      const own = rows.filter((offer) => String(offer.network || "") === network._id);
      return {
        ...network,
        total: own.length,
        withUrl: own.filter((offer) => String(offer.affiliate_url || "").trim()).length,
        bound: own.filter((offer) => Boolean(offer.service)).length,
      };
    });

    console.log("[api/admin/networks] loaded", data.length, "networks,", rows.length, "offers");
    return NextResponse.json({ ok: true, data, total: data.length });
  } catch (err: any) {
    console.error("[api/admin/networks] GET error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
