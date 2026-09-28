"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { useAdminDict } from "@/lib/i18n/admin-dict";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState, ErrorState, Field, LoadingBlock, PageHeader, Pill, dangerButton, fmtAmount, ghostButton, inputClass, primaryButton } from "@/components/admin/kit";
import { PLAN_ACCESS_RULES, type PlanRecord } from "@/lib/types";

interface AdminPlan extends PlanRecord {
  active_subscriptions: number;
}

const EMPTY = {
  name: "",
  slug: "",
  price: "9.99",
  currency: "usd",
  duration_days: "30",
  description: "",
  features: "",
  access_rules: [] as string[],
  ai_credits: "0",
  social_limit: "0",
  publishing_limit: "0",
  scheduling: false,
  analytics: false,
  order_position: "1",
  active: true,
};
type Draft = typeof EMPTY;

export default function AdminPlansPage() {
  const a = useAdminDict();
  const d = a.plans;
  const [plans, setPlans] = useState<AdminPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [edit, setEdit] = useState<{ open: boolean; id: string | null; draft: Draft }>({ open: false, id: null, draft: EMPTY });

  const load = useCallback(async () => {
    const response = await api.get<AdminPlan[]>("/api/admin/plans");
    if (!response.ok) {
      console.error("[admin/plans] load failed:", response.error);
      setError(String(response.error || "error"));
    } else {
      setPlans(response.data || []);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toDraft = (plan: AdminPlan): Draft => ({
    name: plan.name || "",
    slug: plan.slug || "",
    price: String(plan.price ?? 0),
    currency: plan.currency || "usd",
    duration_days: String(plan.duration_days ?? 30),
    description: plan.description || "",
    features: plan.features || "",
    access_rules: plan.access_rules || [],
    ai_credits: String(plan.ai_credits ?? 0),
    social_limit: String(plan.social_limit ?? 0),
    publishing_limit: String(plan.publishing_limit ?? 0),
    scheduling: plan.scheduling === "yes",
    analytics: plan.analytics === "yes",
    order_position: String(plan.order_position ?? 1),
    active: plan.active !== "no",
  });

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setEdit((c) => ({ ...c, draft: { ...c.draft, [key]: value } }));

  const save = async () => {
    const { id, draft } = edit;
    const body = {
      ...draft,
      price: Number(draft.price),
      duration_days: Number(draft.duration_days),
      ai_credits: Number(draft.ai_credits),
      social_limit: Number(draft.social_limit),
      publishing_limit: Number(draft.publishing_limit),
      order_position: Number(draft.order_position),
      scheduling: draft.scheduling ? "yes" : "no",
      analytics: draft.analytics ? "yes" : "no",
      active: draft.active ? "yes" : "no",
    };
    setBusy(true);
    const response = id ? await api.put(`/api/admin/plans/${id}`, body) : await api.post("/api/admin/plans", body);
    setBusy(false);
    if (!response.ok) {
      console.error("[admin/plans] save failed:", response.error);
      toast.error(String(response.error || a.common.error));
      return;
    }
    toast.success(a.common.saved);
    setEdit({ open: false, id: null, draft: EMPTY });
    load();
  };

  const remove = async (plan: AdminPlan) => {
    if (!window.confirm(d.confirmDelete)) return;
    const response = await api.delete<{ deactivated?: boolean }>(`/api/admin/plans/${plan._id}`);
    if (!response.ok) {
      toast.error(String(response.error || a.common.error));
      return;
    }
    toast.success(response.data?.deactivated ? d.deactivated : a.common.saved);
    load();
  };

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorState>{error}</ErrorState>;

  const numberField = (key: "price" | "duration_days" | "ai_credits" | "social_limit" | "publishing_limit" | "order_position", label: string) => (
    <Field label={label}>
      <input className={inputClass} inputMode="decimal" value={edit.draft[key]} onChange={(e) => set(key, e.target.value)} />
    </Field>
  );

  return (
    <div>
      <PageHeader
        title={d.title}
        subtitle={d.subtitle}
        actions={
          <button type="button" className={primaryButton} onClick={() => setEdit({ open: true, id: null, draft: EMPTY })}>
            <Plus className="h-4 w-4" />
            {d.newPlan}
          </button>
        }
      />

      {plans.length === 0 ? (
        <EmptyState>{a.common.empty}</EmptyState>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {plans.map((plan) => (
            <article key={plan._id} className={`glass-strong neon-border relative overflow-hidden rounded-3xl p-5 ${plan.active === "no" ? "opacity-60" : ""}`}>
              <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-[color:var(--neon-violet)]/20 blur-3xl" />
              <div className="relative">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-display text-lg font-extrabold text-white">{plan.name}</p>
                    <p className="text-[11px] text-foreground/40">/{plan.slug}</p>
                  </div>
                  {plan.active === "no" ? <Pill>{a.common.inactive}</Pill> : <Pill tone="green">{a.common.active}</Pill>}
                </div>
                <p className="mt-3 font-display text-3xl font-extrabold text-white">
                  {fmtAmount(plan.price, plan.currency)}
                  <span className="ml-1 text-sm font-semibold text-foreground/45">/ {plan.duration_days} d</span>
                </p>
                {plan.description && <p className="mt-2 text-xs leading-relaxed text-foreground/55">{plan.description}</p>}
                <ul className="mt-3 space-y-1 text-xs text-foreground/75">
                  {String(plan.features || "")
                    .split("\n")
                    .filter((line) => line.trim())
                    .map((line) => (
                      <li key={line}>✦ {line}</li>
                    ))}
                </ul>
                <div className="mt-3 flex flex-wrap gap-1">
                  {(plan.access_rules || []).map((rule) => (
                    <Pill key={rule} tone="violet">{d.rules[rule] || rule}</Pill>
                  ))}
                </div>
                <p className="mt-3 text-[11px] text-foreground/45">
                  {d.aiCredits}: {plan.ai_credits || 0} · {d.socialLimit}: {plan.social_limit || 0} · {d.publishingLimit}: {plan.publishing_limit || 0}
                </p>
                <p className="mt-1 text-[11px] text-foreground/45">
                  {plan.active_subscriptions} {d.activeSubs}
                </p>
                <div className="mt-4 flex gap-2">
                  <button type="button" className={ghostButton} onClick={() => setEdit({ open: true, id: plan._id, draft: toDraft(plan) })}>
                    <Pencil className="h-4 w-4" />
                    {a.common.edit}
                  </button>
                  <button type="button" className={dangerButton} onClick={() => remove(plan)}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <Dialog open={edit.open} onOpenChange={(open) => !busy && setEdit((c) => ({ ...c, open }))}>
        <DialogContent className="panel-solid max-h-[92vh] overflow-y-auto border-white/10 sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">{edit.id ? a.common.edit : d.newPlan}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={d.name}>
              <input className={inputClass} value={edit.draft.name} onChange={(e) => set("name", e.target.value)} />
            </Field>
            <Field label={d.slug}>
              <input className={inputClass} value={edit.draft.slug} onChange={(e) => set("slug", e.target.value)} />
            </Field>
            {numberField("price", d.price)}
            <Field label={d.currency}>
              <select className={inputClass} value={edit.draft.currency} onChange={(e) => set("currency", e.target.value)}>
                <option value="usd">USD</option>
                <option value="eur">EUR</option>
              </select>
            </Field>
            {numberField("duration_days", d.duration)}
            {numberField("ai_credits", d.aiCredits)}
            {numberField("social_limit", d.socialLimit)}
            {numberField("publishing_limit", d.publishingLimit)}
            {numberField("order_position", d.order)}
          </div>
          <Field label={d.description}>
            <textarea className={`${inputClass} min-h-[64px]`} value={edit.draft.description} onChange={(e) => set("description", e.target.value)} />
          </Field>
          <Field label={d.features}>
            <textarea className={`${inputClass} min-h-[96px]`} value={edit.draft.features} onChange={(e) => set("features", e.target.value)} />
          </Field>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground/45">{d.access}</p>
            <div className="flex flex-wrap gap-1.5">
              {PLAN_ACCESS_RULES.map((rule) => {
                const on = edit.draft.access_rules.includes(rule);
                return (
                  <button
                    key={rule}
                    type="button"
                    onClick={() => set("access_rules", on ? edit.draft.access_rules.filter((r) => r !== rule) : [...edit.draft.access_rules, rule])}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                      on ? "border-[color:var(--neon-violet)] bg-violet-500/15 text-white" : "border-white/10 text-foreground/55"
                    }`}
                  >
                    {d.rules[rule]}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex flex-wrap gap-5">
            <label className="flex items-center gap-2 text-sm text-foreground/75">
              <Switch checked={edit.draft.scheduling} onCheckedChange={(v) => set("scheduling", v)} /> {d.scheduling}
            </label>
            <label className="flex items-center gap-2 text-sm text-foreground/75">
              <Switch checked={edit.draft.analytics} onCheckedChange={(v) => set("analytics", v)} /> {d.analytics}
            </label>
            <label className="flex items-center gap-2 text-sm text-foreground/75">
              <Switch checked={edit.draft.active} onCheckedChange={(v) => set("active", v)} /> {a.common.active}
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className={ghostButton} onClick={() => setEdit((c) => ({ ...c, open: false }))}>{a.common.cancel}</button>
            <button type="button" className={primaryButton} disabled={busy} onClick={save}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {a.common.save}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
