import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { totalumSdk } from "@/lib/totalum";
import { logAdminAction } from "@/lib/audit";
import { hasDisallowedTags, parseSiteCode } from "@/lib/site-code";
import { TAG_TYPES, invalidateSiteTags, listSiteTags } from "@/lib/site-tags";

export const dynamic = "force-dynamic";

const CODE_MAX = 20_000;
const PLACEMENTS = ["head", "body"];
const SCOPES = ["all", "home"];

function validateBody(body: any): { payload: Record<string, any>; error?: string } {
  const name = String(body?.name || "").trim().slice(0, 80);
  if (name.length < 2) return { payload: {}, error: "Name is required" };
  const tagType = TAG_TYPES.includes(body?.tag_type) ? body.tag_type : "";
  if (!tagType) return { payload: {}, error: "Invalid tag type" };
  const placement = PLACEMENTS.includes(body?.placement) ? body.placement : "";
  if (!placement) return { payload: {}, error: "Invalid placement" };
  const scope = SCOPES.includes(body?.scope) ? body.scope : "all";
  const code = String(body?.code || "").trim();
  if (code.length > CODE_MAX) return { payload: {}, error: "Code is too long" };
  if (code && hasDisallowedTags(code)) return { payload: {}, error: "Only <meta> and <script> tags are allowed" };
  if (!code || parseSiteCode(code).length === 0) return { payload: {}, error: "Paste at least one valid <meta> or <script> tag" };
  const enabled = body?.enabled === false ? "no" : "yes";
  return { payload: { name, tag_type: tagType, placement, scope, code, enabled } };
}

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    return NextResponse.json({ ok: true, data: await listSiteTags() });
  } catch (err: any) {
    console.error("[api/admin/site-tags] GET error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    const { payload, error } = validateBody(await request.json().catch(() => ({})));
    if (error) return NextResponse.json({ ok: false, error }, { status: 400 });
    const created = await totalumSdk.crud.createRecord("site_tags", payload);
    if (created.errors) {
      console.error("[api/admin/site-tags] create errors:", created.errors);
      return NextResponse.json({ ok: false, error: created.errors }, { status: 400 });
    }
    invalidateSiteTags();
    const id = String((created.data as any)?.insertedId || "");
    await logAdminAction(admin._id, "site_tag.create", "site_tags", id, { name: payload.name, tag_type: payload.tag_type });
    console.log("[api/admin/site-tags] created:", id, payload.name);
    return NextResponse.json({ ok: true, data: { _id: id } });
  } catch (err: any) {
    console.error("[api/admin/site-tags] POST error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
