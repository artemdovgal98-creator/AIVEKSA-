"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Coins, Crown, Loader2, Search, Shield, XCircle } from "lucide-react";
import { api } from "@/lib/api";
import { useAdminDict } from "@/lib/i18n/admin-dict";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState, ErrorState, Field, LoadingBlock, PageHeader, Pill, StatusPill, fmtDate, ghostButton, inputClass, primaryButton } from "@/components/admin/kit";

interface AdminUser {
  _id: string;
  name: string;
  email: string;
  role: string;
  createdAt?: string;
  plan: string | null;
  subscription_status: string | null;
  subscription_end: string | null;
  subscription_id: string | null;
  credits: number;
  last_active: string | null;
}

type Action = { type: "credits" | "plan" | "cancel"; user: AdminUser };

export default function AdminUsersPage() {
  const a = useAdminDict();
  const d = a.users;
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [plans, setPlans] = useState<{ _id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [action, setAction] = useState<Action | null>(null);
  const [form, setForm] = useState({ amount: "", reason: "", plan_id: "" });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const response = await api.get<AdminUser[]>("/api/admin/users");
    if (!response.ok) {
      console.error("[admin/users] load failed:", response.error);
      setError(String(response.error || "error"));
    } else {
      setUsers(response.data || []);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    api.get<{ _id: string; name: string; active?: string }[]>("/api/admin/plans").then((response) => {
      if (response.ok) setPlans((response.data || []).filter((plan) => plan.active !== "no"));
    });
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((user) => `${user.email} ${user.name}`.toLowerCase().includes(q));
  }, [users, query]);

  const post = async (user: AdminUser, body: Record<string, unknown>) => {
    setBusy(true);
    const response = await api.post(`/api/admin/users/${user._id}`, body);
    setBusy(false);
    if (!response.ok) {
      console.error("[admin/users] action failed:", body.action, response.error);
      toast.error(String(response.error || a.common.error));
      return false;
    }
    toast.success(a.common.saved);
    load();
    return true;
  };

  const submit = async () => {
    if (!action) return;
    if (!form.reason.trim() && action.type !== "plan") {
      toast.error(d.reasonRequired);
      return;
    }
    const body =
      action.type === "credits"
        ? { action: "adjust_credits", amount: Number(form.amount), reason: form.reason }
        : action.type === "plan"
          ? { action: "grant_plan", plan_id: form.plan_id, reason: form.reason }
          : { action: "cancel_subscription", reason: form.reason };
    if (await post(action.user, body)) setAction(null);
  };

  const toggleRole = (user: AdminUser) => post(user, { action: "set_role", role: user.role === "admin" ? "user" : "admin" });

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorState>{error}</ErrorState>;

  return (
    <div>
      <PageHeader title={d.title} subtitle={d.subtitle} />
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/35" />
        <input className={`${inputClass} pl-9`} placeholder={a.common.search} value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState>{a.common.empty}</EmptyState>
      ) : (
        <div className="glass overflow-x-auto rounded-2xl">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-white/8 text-left text-[11px] uppercase tracking-wide text-foreground/40">
                <th className="px-4 py-3">{a.common.user}</th>
                <th className="px-3 py-3">{d.registered}</th>
                <th className="px-3 py-3">{d.role}</th>
                <th className="px-3 py-3">{a.common.plan}</th>
                <th className="px-3 py-3">{d.subscription}</th>
                <th className="px-3 py-3 text-right">{d.credits}</th>
                <th className="px-3 py-3">{d.lastActive}</th>
                <th className="px-4 py-3 text-right">{a.common.actions}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => (
                <tr key={user._id} className="border-b border-white/5 last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-white">{user.name || "—"}</p>
                    <p className="text-[11px] text-foreground/45">{user.email}</p>
                  </td>
                  <td className="px-3 py-3 text-xs text-foreground/60">{fmtDate(user.createdAt)}</td>
                  <td className="px-3 py-3">{user.role === "admin" ? <Pill tone="violet">ADMIN</Pill> : <Pill>USER</Pill>}</td>
                  <td className="px-3 py-3 text-xs text-white">{user.plan || d.free}</td>
                  <td className="px-3 py-3">
                    {user.subscription_status ? (
                      <div>
                        <StatusPill status={user.subscription_status} label={a.billing.statuses[user.subscription_status]} />
                        {user.subscription_end && (
                          <p className="mt-0.5 text-[10px] text-foreground/40">
                            {d.until} {fmtDate(user.subscription_end)}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-foreground/35">N/A</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right font-bold text-white">{user.credits}</td>
                  <td className="px-3 py-3 text-xs text-foreground/50">{user.last_active ? fmtDate(user.last_active) : "N/A"}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <IconButton title={d.adjustCredits} onClick={() => { setForm({ amount: "", reason: "", plan_id: "" }); setAction({ type: "credits", user }); }}>
                        <Coins className="h-4 w-4" />
                      </IconButton>
                      <IconButton title={d.grantPlan} onClick={() => { setForm({ amount: "", reason: "", plan_id: plans[0]?._id || "" }); setAction({ type: "plan", user }); }}>
                        <Crown className="h-4 w-4" />
                      </IconButton>
                      {user.subscription_id && (
                        <IconButton title={d.cancelSub} onClick={() => { setForm({ amount: "", reason: "", plan_id: "" }); setAction({ type: "cancel", user }); }}>
                          <XCircle className="h-4 w-4" />
                        </IconButton>
                      )}
                      <IconButton title={user.role === "admin" ? d.makeUser : d.makeAdmin} onClick={() => toggleRole(user)}>
                        <Shield className={`h-4 w-4 ${user.role === "admin" ? "text-violet-300" : ""}`} />
                      </IconButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={Boolean(action)} onOpenChange={(open) => !open && !busy && setAction(null)}>
        <DialogContent className="panel-solid border-white/10 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">
              {action?.type === "credits" ? d.adjustCredits : action?.type === "plan" ? d.grantPlan : d.cancelSub}
            </DialogTitle>
          </DialogHeader>
          {action && (
            <div className="space-y-3">
              <p className="text-xs text-foreground/55">{action.user.email}</p>
              {action.type === "credits" && (
                <Field label={a.common.amount} hint={`${d.amountHint} · ${d.credits}: ${action.user.credits}`}>
                  <input className={inputClass} inputMode="numeric" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
                </Field>
              )}
              {action.type === "plan" && (
                <Field label={a.common.plan}>
                  <select className={inputClass} value={form.plan_id} onChange={(e) => setForm((f) => ({ ...f, plan_id: e.target.value }))}>
                    {plans.map((plan) => (
                      <option key={plan._id} value={plan._id}>{plan.name}</option>
                    ))}
                  </select>
                </Field>
              )}
              {action.type === "cancel" && <p className="text-sm text-amber-200">{d.confirmCancel}</p>}
              <Field label={a.common.reason}>
                <input className={inputClass} value={form.reason} maxLength={300} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} />
              </Field>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className={ghostButton} onClick={() => setAction(null)}>{a.common.cancel}</button>
            <button type="button" className={primaryButton} disabled={busy} onClick={submit}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {a.common.confirm}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function IconButton({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" title={title} onClick={onClick} className="rounded-lg p-2 text-foreground/50 transition hover:bg-white/8 hover:text-white">
      {children}
    </button>
  );
}
