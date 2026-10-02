import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { totalumSdk } from "@/lib/totalum";
import { logAdminAction } from "@/lib/audit";
import { SUBID_PARAM_PATTERN } from "@/lib/affiliate-tracking";

export const dynamic = "force-dynamic";

function newSecret(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * PUT { subid_param?, regenerateSecret?: true }
 * The postback URL (with the secret) is returned ONLY right after it is generated,
 * so the admin can paste it into the network panel. Afterwards only "set / not set" is shown.
 */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    const { id } = await params;
    if (!/^[a-f0-9]{24}$/.test(id)) return NextResponse.json({ ok: false, error: "Invalid id" }, { status: 400 });

    const found = await totalumSdk.crud.getRecordById("affiliate_networks", id);
    const network = found.data as any;
    if (!network) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

    const body = (await request.json().catch(() => ({}))) as { subid_param?: unknown; regenerateSecret?: unknown };
    const update: Record<string, string> = {};
    if (typeof body.subid_param === "string") {
      const value = body.subid_param.trim();
      if (value && !SUBID_PARAM_PATTERN.test(value)) {
        return NextResponse.json({ ok: false, error: "Invalid parameter name" }, { status: 400 });
      }
      update.subid_param = value;
    }
    const secret = body.regenerateSecret === true ? newSecret() : null;
    if (secret) update.postback_secret = secret;
    if (Object.keys(update).length === 0) return NextResponse.json({ ok: false, error: "Nothing to update" }, { status: 400 });

    const saved = await totalumSdk.crud.editRecordById("affiliate_networks", id, update);
    if (saved.errors) {
      console.error("[api/admin/networks/:id] update failed:", saved.errors);
      return NextResponse.json({ ok: false, error: "Update failed" }, { status: 500 });
    }
    await logAdminAction(admin._id, "network.tracking.update", "affiliate_network", id, {
      subid_param: update.subid_param ?? "(unchanged)",
      secret_regenerated: Boolean(secret),
    });

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin).replace(/\/$/, "");
    const postbackUrl = secret
      ? `${appUrl}/api/postback/${network.slug}?token=${secret}&click_id={CLICK_ID}&transaction_id={TRANSACTION_ID}&payout={PAYOUT}&currency={CURRENCY}&status={STATUS}`
      : null;
    console.log(`[api/admin/networks/:id] ${network.slug} tracking updated (secret regenerated: ${Boolean(secret)})`);
    return NextResponse.json({
      ok: true,
      data: {
        subid_param: update.subid_param ?? network.subid_param ?? "",
        postbackConfigured: Boolean(secret || String(network.postback_secret || "").trim()),
        postbackUrl,
      },
    });
  } catch (err: any) {
    console.error("[api/admin/networks/:id] error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
