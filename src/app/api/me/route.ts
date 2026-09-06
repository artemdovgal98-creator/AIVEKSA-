import { NextResponse } from "next/server";
import { getCurrentDbUser } from "@/lib/admin-auth";
import { totalumSdk } from "@/lib/totalum";
import { readCount } from "@/lib/aggregate";
import { buildProfilePayload } from "@/lib/admin-payload";
import { PROFILE_LINK_FIELDS, PROFILE_TEXT_FIELDS } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Current user with the authoritative role, public profile and favorites count. */
export async function GET() {
  try {
    const user = await getCurrentDbUser();
    if (!user) return NextResponse.json({ ok: true, data: null });

    const favorites = await totalumSdk.crud.query("favorites", {
      _filter: { user: user._id },
      _aggregate: { _count: true },
    });
    const favoritesCount = readCount(favorites);

    const profile: Record<string, any> = {};
    for (const key of [...PROFILE_TEXT_FIELDS, ...PROFILE_LINK_FIELDS]) {
      profile[key] = (user as any)[key] || "";
    }

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
        ...profile,
        photos: (user as any).photos || [],
        show_contacts: (user as any).show_contacts || "no",
      },
    });
  } catch (err: any) {
    console.error("[api/me] error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}

/**
 * Updates the signed-in user's own profile.
 *
 * Accepts either just `{ language }` (the language switcher) or the whole
 * public profile — only the submitted keys are written.
 */
export async function PUT(request: Request) {
  try {
    const user = await getCurrentDbUser();
    if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const body = (await request.json().catch(() => ({}))) as Record<string, any>;

    // Language-only update keeps its strict validation.
    const keys = Object.keys(body);
    if (keys.length === 1 && keys[0] === "language") {
      if (!["ru", "uk", "en"].includes(body.language || "")) {
        return NextResponse.json({ ok: false, error: "Invalid language" }, { status: 400 });
      }
      const updated = await totalumSdk.crud.editRecordById("user", user._id, { language: body.language });
      if (updated.errors) {
        console.error("[api/me] language update errors:", updated.errors);
        return NextResponse.json({ ok: false, error: updated.errors }, { status: 400 });
      }
      return NextResponse.json({ ok: true, data: { language: body.language } });
    }

    const payload = buildProfilePayload(body);
    if (Object.keys(payload).length === 0) {
      return NextResponse.json({ ok: false, error: "Нечего сохранять" }, { status: 400 });
    }

    const updated = await totalumSdk.crud.editRecordById("user", user._id, payload);
    if (updated.errors) {
      console.error("[api/me] profile update errors:", updated.errors);
      return NextResponse.json({ ok: false, error: updated.errors }, { status: 400 });
    }
    console.log("[api/me] profile updated for", user._id, "fields:", Object.keys(payload).join(","));
    return NextResponse.json({ ok: true, data: { updated: Object.keys(payload) } });
  } catch (err: any) {
    console.error("[api/me] PUT error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
