import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { totalumSdk } from "@/lib/totalum";
import { logAdminAction } from "@/lib/audit";
import { hasDisallowedTags, parseSiteCode } from "@/lib/site-code";
import { TAG_TYPES, invalidateSiteTags } from "@/lib/site-tags";

export const dynamic = "force-dynamic";
const OBJECT_ID = /^[a-f0-9]{24}$/i;
const PLACEMENTS = ["head", "body"];
const SCOPES = ["all", "home"];
const CODE_MAX = 20_000;

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

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    const { id } = await params;
    if (!OBJECT_ID.test(id)) return NextResponse.json({ ok: false, error: "Invalid id" }, { status: 400 });
    const { payload, error } = validateBody(await request.json().catch(() => ({})));
    if (error) return NextResponse.json({ ok: false, error }, { status: 400 });
    const updated = await totalumSdk.crud.editRecordById("site_tags", id, payload);
    if (updated.errors) {
      console.error("[api/admin/site-tags] update errors:", updated.errors);
      return NextResponse.json({ ok: false, error: updated.errors }, { status: 400 });
    }
    invalidateSiteTags();
    await logAdminAction(admin._id, "site_tag.update", "site_tags", id, { name: payload.name, enabled: payload.enabled });
    console.log("[api/admin/site-tags] updated:", id);
    return NextResponse.json({ ok: true, data: { _id: id } });
  } catch (err: any) {
    console.error("[api/admin/site-tags] PUT error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    const { id } = await params;
    if (!OBJECT_ID.test(id)) return NextResponse.json({ ok: false, error: "Invalid id" }, { status: 400 });
    const deleted = await totalumSdk.crud.deleteRecordById("site_tags", id);
    if (deleted.errors) {
      console.error("[api/admin/site-tags] delete errors:", deleted.errors);
      return NextResponse.json({ ok: false, error: deleted.errors }, { status: 400 });
    }
    invalidateSiteTags();
    await logAdminAction(admin._id, "site_tag.delete", "site_tags", id);
    console.log("[api/admin/site-tags] deleted:", id);
    return NextResponse.json({ ok: true, data: { _id: id, deleted: true } });
  } catch (err: any) {
    console.error("[api/admin/site-tags] DELETE error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
