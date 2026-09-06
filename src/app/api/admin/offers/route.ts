import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { totalumSdk } from "@/lib/totalum";
import { buildOfferPayload } from "@/lib/admin-payload";

export const dynamic = "force-dynamic";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * GET — offers of one network (or of all of them), with the network and the
 * bound catalog service expanded so the admin table renders in a single call.
 *
 * Query params: `network` (network _id), `q` (name / offer id), `link`
 * ("with" | "without"), `bound` ("yes" | "no").
 */
export async function GET(request: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const network = (searchParams.get("network") || "").trim();
    const q = (searchParams.get("q") || "").trim();
    const link = (searchParams.get("link") || "").trim();
    const bound = (searchParams.get("bound") || "").trim();

    const filter: Record<string, any> = {};
    if (network) filter.network = network;
    if (q) {
      const regex = { regex: escapeRegex(q), options: "i" };
      filter._or = [{ offer_name: regex }, { external_id: regex }, { affiliate_url: regex }];
    }

    const result = await totalumSdk.crud.query("affiliate_offers", {
      _filter: filter,
      _sort: { order_position: "asc" },
      _limit: 2000,
      network: true,
      service: true,
    });
    if (result.errors) {
      console.error("[api/admin/offers] list errors:", result.errors);
      return NextResponse.json({ ok: false, error: result.errors }, { status: 400 });
    }

    let data = (result.data || []) as any[];
    if (link === "with") data = data.filter((offer) => String(offer.affiliate_url || "").trim());
    if (link === "without") data = data.filter((offer) => !String(offer.affiliate_url || "").trim());
    if (bound === "yes") data = data.filter((offer) => Boolean(offer.service));
    if (bound === "no") data = data.filter((offer) => !offer.service);

    console.log(`[api/admin/offers] ${data.length} offers (network=${network || "all"}, q="${q}")`);
    return NextResponse.json({ ok: true, data, total: data.length });
  } catch (err: any) {
    console.error("[api/admin/offers] GET error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}

/** POST — add a new offer to a network by hand. */
export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

    const body = await request.json().catch(() => ({}));
    const payload = buildOfferPayload(body);
    if (!payload.offer_name) {
      return NextResponse.json({ ok: false, error: "Offer name is required" }, { status: 400 });
    }
    if (!payload.network) {
      return NextResponse.json({ ok: false, error: "Network is required" }, { status: 400 });
    }
    if (typeof payload.active === "undefined") payload.active = "yes";

    const created = await totalumSdk.crud.createRecord("affiliate_offers", payload);
    if (created.errors) {
      console.error("[api/admin/offers] create errors:", created.errors);
      return NextResponse.json({ ok: false, error: created.errors }, { status: 400 });
    }
    console.log("[api/admin/offers] created", payload.offer_name, "by", admin._id);
    return NextResponse.json({ ok: true, data: created.data });
  } catch (err: any) {
    console.error("[api/admin/offers] POST error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
