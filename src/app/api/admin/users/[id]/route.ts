import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { totalumSdk } from "@/lib/totalum";
import { logAdminAction } from "@/lib/audit";
import { applyCreditChange, InsufficientCreditsError } from "@/lib/credits";
import { activatePlan } from "@/lib/billing";
import { getActiveSubscription } from "@/lib/access";
import type { PlanRecord } from "@/lib/types";

export const dynamic = "force-dynamic";
const OBJECT_ID = /^[a-f0-9]{24}$/i;

/**
 * POST — manual admin actions on a user. Every action is validated here and
 * written to admin_audit_log.
 *   { action: "adjust_credits", amount: ±int, reason }
 *   { action: "grant_plan", plan_id, reason }
 *   { action: "cancel_subscription", reason }
 *   { action: "set_role", role: "admin" | "user" }
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    const { id } = await params;
    if (!OBJECT_ID.test(id)) return NextResponse.json({ ok: false, error: "Invalid id" }, { status: 400 });
    const target = await totalumSdk.crud.getRecordById("user", id);
    if (!target.data) return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });

    const body = (await request.json().catch(() => ({}))) as Record<string, any>;
    const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 300) : "";

    switch (body.action) {
      case "adjust_credits": {
        const amount = Math.trunc(Number(body.amount));
        if (!Number.isFinite(amount) || amount === 0 || Math.abs(amount) > 1_000_000) {
          return NextResponse.json({ ok: false, error: "Amount must be a non-zero integer" }, { status: 400 });
        }
        if (!reason) return NextResponse.json({ ok: false, error: "Reason is required" }, { status: 400 });
        const result = await applyCreditChange({
          userId: id,
          amount,
          type: "admin_adjustment",
          referenceId: admin._id,
          description: `Admin: ${reason}`,
        });
        await logAdminAction(admin._id, "credits.adjust", "user", id, { amount, reason, balance: result.balance });
        return NextResponse.json({ ok: true, data: result });
      }
      case "grant_plan": {
        const planId = String(body.plan_id || "");
        if (!OBJECT_ID.test(planId)) return NextResponse.json({ ok: false, error: "Invalid plan" }, { status: 400 });
        const plan = await totalumSdk.crud.getRecordById("plans", planId);
        if (!plan.data) return NextResponse.json({ ok: false, error: "Plan not found" }, { status: 404 });
        const result = await activatePlan(id, plan.data as unknown as PlanRecord, "admin", admin._id);
        await logAdminAction(admin._id, "subscription.grant", "user", id, { plan: (plan.data as any).slug, reason, ...result });
        return NextResponse.json({ ok: true, data: result });
      }
      case "cancel_subscription": {
        const current = await getActiveSubscription(id);
        if (!current) return NextResponse.json({ ok: false, error: "No active subscription" }, { status: 404 });
        const r = await totalumSdk.crud.editRecordById("subscriptions", current._id, { status: "cancelled", end_date: new Date().toISOString() });
        if (r.errors) return NextResponse.json({ ok: false, error: r.errors }, { status: 400 });
        await logAdminAction(admin._id, "subscription.cancel", "subscriptions", current._id, { user: id, reason });
        return NextResponse.json({ ok: true, data: { _id: current._id } });
      }
      case "set_role": {
        const role = body.role === "admin" ? "admin" : body.role === "user" ? "user" : "";
        if (!role) return NextResponse.json({ ok: false, error: "Invalid role" }, { status: 400 });
        if (id === admin._id && role !== "admin") {
          return NextResponse.json({ ok: false, error: "You cannot remove your own admin role" }, { status: 400 });
        }
        const r = await totalumSdk.crud.editRecordById("user", id, { role });
        if (r.errors) return NextResponse.json({ ok: false, error: r.errors }, { status: 400 });
        await logAdminAction(admin._id, "user.role", "user", id, { from: (target.data as any).role || "user", to: role });
        return NextResponse.json({ ok: true, data: { role } });
      }
      default:
        return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
    }
  } catch (err: any) {
    if (err instanceof InsufficientCreditsError) {
      return NextResponse.json({ ok: false, error: `Balance cannot go negative (balance ${err.balance})` }, { status: 400 });
    }
    console.error("[api/admin/users] POST error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
