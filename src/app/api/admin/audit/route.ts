import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { totalumSdk } from "@/lib/totalum";

export const dynamic = "force-dynamic";

/** Latest admin actions (manual changes, price edits, credit adjustments…). */
export async function GET(request: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    const targetType = new URL(request.url).searchParams.get("target_type") || "";
    const filter: Record<string, any> = {};
    if (/^[a-z_]{1,40}$/.test(targetType)) filter.target_type = targetType;
    const result = await totalumSdk.crud.query("admin_audit_log", { _filter: filter, _sort: { createdAt: "desc" }, _limit: 200, admin: true });
    if (result.errors) {
      console.error("[api/admin/audit] query errors:", result.errors);
      return NextResponse.json({ ok: false, error: result.errors }, { status: 500 });
    }
    const rows = ((result.data || []) as any[]).map((row) => ({
      ...row,
      admin: row.admin && typeof row.admin === "object" ? { _id: row.admin._id, email: row.admin.email, name: row.admin.name } : null,
    }));
    return NextResponse.json({ ok: true, data: rows });
  } catch (err: any) {
    console.error("[api/admin/audit] GET error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
