import { NextResponse } from "next/server";
import { getServiceBySlug, getSimilarServices } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const service = await getServiceBySlug(slug);
    if (!service) {
      return NextResponse.json({ ok: false, error: "Service not found" }, { status: 404 });
    }
    const similar = await getSimilarServices(service);
    return NextResponse.json({ ok: true, data: { service, similar } });
  } catch (err: any) {
    console.error("[api/services/:slug] error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
