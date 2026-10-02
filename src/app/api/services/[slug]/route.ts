import { NextResponse } from "next/server";
import { getServiceBySlug, getSimilarServices } from "@/lib/catalog";
import { attachPartnerOffers } from "@/lib/offers";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const found = await getServiceBySlug(slug);
    if (!found || found.active === "no") {
      return NextResponse.json({ ok: false, error: "Service not found" }, { status: 404 });
    }
    // Public shape: internal affiliate bookkeeping is stripped, only /go/<offer_slug> is exposed.
    const [service] = await attachPartnerOffers([found]);
    const similar = await getSimilarServices(found);
    return NextResponse.json({ ok: true, data: { service, similar } });
  } catch (err: any) {
    console.error("[api/services/:slug] error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
