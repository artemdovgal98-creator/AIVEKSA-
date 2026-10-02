import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { totalumSdk } from "@/lib/totalum";

export const dynamic = "force-dynamic";

const refId = (value: any): string => (value && typeof value === "object" ? value._id : value) || "";
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Users with registration date, role, current plan / subscription and credits — all from the DB. */
export async function GET(request: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

    const q = (new URL(request.url).searchParams.get("q") || "").trim().slice(0, 80);
    const filter: Record<string, any> = {};
    if (q) filter._or = [{ email: { regex: escapeRegex(q), options: "i" } }, { name: { regex: escapeRegex(q), options: "i" } }];

    const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
    const [users, subs, accounts, sessions] = await Promise.all([
      totalumSdk.crud.query("user", { _filter: filter, _sort: { createdAt: "desc" }, _limit: 500 }),
      totalumSdk.crud.query("subscriptions", { _sort: { end_date: "desc" }, _limit: 2000, plan: true }),
      totalumSdk.crud.query("ai_credit_accounts", { _limit: 2000 }),
      totalumSdk.crud.query("session", { _filter: { updatedAt: { gte: since } }, _limit: 5000 }),
    ]);
    if (users.errors) {
      console.error("[api/admin/users] list errors:", users.errors);
      return NextResponse.json({ ok: false, error: users.errors }, { status: 500 });
    }

    const now = new Date().toISOString();
    const latestSub = new Map<string, any>();
    for (const sub of (subs.data || []) as any[]) {
      const id = refId(sub.user);
      if (!id || latestSub.has(id)) continue;
      latestSub.set(id, sub);
    }
    const balances = new Map<string, number>();
    for (const account of (accounts.data || []) as any[]) balances.set(refId(account.user), Number(account.balance) || 0);
    const lastSeen = new Map<string, string>();
    for (const session of (sessions.data || []) as any[]) {
      const id = refId(session.user_id);
      if (id && (!lastSeen.has(id) || lastSeen.get(id)! < session.updatedAt)) lastSeen.set(id, session.updatedAt);
    }

    const data = ((users.data || []) as any[]).map((user) => {
      const sub = latestSub.get(user._id);
      const live = sub && ["active", "paid"].includes(sub.status) && (!sub.end_date || sub.end_date >= now);
      return {
        _id: user._id,
        name: user.name || "",
        email: user.email || "",
        role: user.role || "user",
        createdAt: user.createdAt,
        plan: live && sub.plan && typeof sub.plan === "object" ? sub.plan.name : null,
        subscription_status: sub ? (live ? sub.status : sub.status === "active" ? "expired" : sub.status) : null,
        subscription_end: sub?.end_date || null,
        subscription_id: live ? sub._id : null,
        credits: balances.get(user._id) || 0,
        last_active: lastSeen.get(user._id) || null,
      };
    });
    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    console.error("[api/admin/users] GET error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
