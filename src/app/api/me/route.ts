import { NextResponse } from "next/server";
import { getCurrentDbUser } from "@/lib/admin-auth";
import { totalumSdk } from "@/lib/totalum";
import { readCount } from "@/lib/aggregate";

export const dynamic = "force-dynamic";

/** Current user with the authoritative role + saved favorites count. */
export async function GET() {
  try {
    const user = await getCurrentDbUser();
    if (!user) return NextResponse.json({ ok: true, data: null });

    const favorites = await totalumSdk.crud.query("favorites", {
      _filter: { user: user._id },
      _aggregate: { _count: true },
    });
    const favoritesCount = readCount(favorites);

    return NextResponse.json({
      ok: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role || "user",
        language: user.language || null,
        createdAt: user.createdAt,
        favoritesCount,
      },
    });
  } catch (err: any) {
    console.error("[api/me] error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}

/** Persists the interface language on the user profile. */
export async function PUT(request: Request) {
  try {
    const user = await getCurrentDbUser();
    if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const body = (await request.json().catch(() => ({}))) as { language?: string };
    if (!["ru", "uk", "en"].includes(body.language || "")) {
      return NextResponse.json({ ok: false, error: "Invalid language" }, { status: 400 });
    }

    const updated = await totalumSdk.crud.editRecordById("user", user._id, { language: body.language });
    if (updated.errors) console.error("[api/me] update errors:", updated.errors);
    return NextResponse.json({ ok: true, data: { language: body.language } });
  } catch (err: any) {
    console.error("[api/me] PUT error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
