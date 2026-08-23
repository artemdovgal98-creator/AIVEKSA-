import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/admin-auth";
import { totalumSdk } from "@/lib/totalum";
import type { FavoriteRecord, ServiceRecord } from "@/lib/types";

export const dynamic = "force-dynamic";

/** GET — favorites of the signed-in user, services expanded. */
export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser?.id) return NextResponse.json({ ok: true, data: [] });

    const result = await totalumSdk.crud.query("favorites", {
      _filter: { user: sessionUser.id },
      _sort: { saved_at: "desc" },
      _limit: 200,
      service: { category: true },
    });
    if (result.errors) console.error("[api/favorites] query errors:", result.errors);

    const favorites = (result.data || []) as FavoriteRecord[];
    const services = favorites
      .map((favorite) => favorite.service)
      .filter((service): service is ServiceRecord => Boolean(service) && typeof service === "object");

    return NextResponse.json({ ok: true, data: services, total: services.length });
  } catch (err: any) {
    console.error("[api/favorites] GET error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}

/** POST { service_id } — saves a favorite (idempotent). */
export async function POST(request: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser?.id) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const body = (await request.json().catch(() => ({}))) as { service_id?: string };
    if (!body.service_id) {
      return NextResponse.json({ ok: false, error: "service_id is required" }, { status: 400 });
    }

    const existing = await totalumSdk.crud.query("favorites", {
      _filter: { user: sessionUser.id, service: body.service_id },
      _limit: 1,
    });
    if ((existing.data || []).length) {
      return NextResponse.json({ ok: true, data: (existing.data as any[])[0] });
    }

    const created = await totalumSdk.crud.createRecord("favorites", {
      user: sessionUser.id,
      service: body.service_id,
      saved_at: new Date().toISOString(),
    });
    if (created.errors) console.error("[api/favorites] create errors:", created.errors);
    console.log("[api/favorites] saved service", body.service_id, "for user", sessionUser.id);
    return NextResponse.json({ ok: true, data: created.data });
  } catch (err: any) {
    console.error("[api/favorites] POST error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}

/** DELETE ?service_id=... — removes a favorite. */
export async function DELETE(request: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser?.id) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const serviceId = searchParams.get("service_id");
    if (!serviceId) {
      return NextResponse.json({ ok: false, error: "service_id is required" }, { status: 400 });
    }

    const existing = await totalumSdk.crud.query("favorites", {
      _filter: { user: sessionUser.id, service: serviceId },
      _limit: 10,
    });
    for (const favorite of (existing.data || []) as FavoriteRecord[]) {
      await totalumSdk.crud.deleteRecordById("favorites", favorite._id);
    }
    console.log("[api/favorites] removed service", serviceId, "for user", sessionUser.id);
    return NextResponse.json({ ok: true, data: { removed: (existing.data || []).length } });
  } catch (err: any) {
    console.error("[api/favorites] DELETE error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
