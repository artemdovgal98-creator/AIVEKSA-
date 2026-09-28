"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Activity, Archive, ChevronDown, ExternalLink, Loader2, PlusCircle, Save, Star } from "lucide-react";
import { api } from "@/lib/api";
import { useAdminDict } from "@/lib/i18n/admin-dict";
import { formatMoney } from "@/lib/money";
import { Switch } from "@/components/ui/switch";
import { Field, Pill, StatusPill, dangerButton, fmtDate, ghostButton, inputClass, primaryButton } from "@/components/admin/kit";
import { OFFER_STATUSES, PAYOUT_MODELS } from "@/lib/types";
import { pct, type MarketNetwork, type MarketOffer } from "./types";

export interface ServiceOption {
  _id: string;
  label: string;
}

/** One offer: metrics at a glance, inline editor, health check and conversion report. */
export function OfferRow({
  offer,
  networks,
  services,
  onChanged,
}: {
  offer: MarketOffer;
  networks: MarketNetwork[];
  services: ServiceOption[];
  onChanged: () => void;
}) {
  const a = useAdminDict();
  const d = a.market;
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [draft, setDraft] = useState(() => ({
    affiliate_url: offer.affiliate_url,
    tracking_url: offer.tracking_url,
    payout: offer.payout === null ? "" : String(offer.payout),
    payout_model: offer.payout_model,
    quality_score: offer.quality_score === null ? "" : String(offer.quality_score),
    status: offer.status,
    is_primary: offer.is_primary === "yes",
    sponsored: offer.sponsored === "yes",
    network: offer.network?._id || "",
    service: offer.service?._id || "",
    notes: offer.notes,
  }));
  const [conversion, setConversion] = useState({ amount: "", currency: "usd", status: "confirmed" });

  const set = <K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) => setDraft((c) => ({ ...c, [key]: value }));

  const save = async () => {
    setBusy("save");
    const response = await api.put(`/api/admin/offers/${offer._id}`, {
      affiliate_url: draft.affiliate_url,
      tracking_url: draft.tracking_url,
      payout: draft.payout === "" ? 0 : Number(draft.payout),
      payout_model: draft.payout_model,
      quality_score: draft.quality_score === "" ? 0 : Number(draft.quality_score),
      status: draft.status,
      is_primary: draft.is_primary ? "yes" : "no",
      sponsored: draft.sponsored ? "yes" : "no",
      network: draft.network || null,
      service: draft.service || null,
      notes: draft.notes,
    });
    setBusy(null);
    if (!response.ok) {
      console.error("[marketplace] offer save failed:", response.error);
      toast.error(String(response.error || a.common.error));
      return;
    }
    toast.success(a.common.saved);
    onChanged();
  };

  const check = async () => {
    setBusy("check");
    const response = await api.post<{ status: string; health_note: string }>(`/api/admin/offers/${offer._id}/check`, {});
    setBusy(null);
    if (!response.ok) {
      console.error("[marketplace] health check failed:", response.error);
      toast.error(String(response.error || a.common.error));
      return;
    }
    toast.message(`${d.status[response.data?.status || ""] || response.data?.status}: ${response.data?.health_note || ""}`);
    onChanged();
  };

  const archive = async () => {
    if (!window.confirm(d.confirmArchive)) return;
    setBusy("archive");
    const response = await api.delete(`/api/admin/offers/${offer._id}`);
    setBusy(null);
    if (!response.ok) {
      toast.error(String(response.error || a.common.error));
      return;
    }
    onChanged();
  };

  const report = async () => {
    const amount = Number(conversion.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error(d.convAmount);
      return;
    }
    setBusy("conversion");
    const response = await api.post("/api/admin/earnings", {
      offer: offer._id,
      earned_amount: amount,
      currency: conversion.currency,
      conversion_status: conversion.status,
    });
    setBusy(null);
    if (!response.ok) {
      console.error("[marketplace] conversion report failed:", response.error);
      toast.error(String(response.error || a.common.error));
      return;
    }
    setConversion({ amount: "", currency: conversion.currency, status: conversion.status });
    toast.success(a.common.saved);
    onChanged();
  };

  const m = offer.metrics;
  return (
    <li className="glass rounded-2xl">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-left">
        <span className="h-8 w-1.5 shrink-0 rounded-full" style={{ background: offer.network?.accent_color || "#6366f1" }} />
        <div className="min-w-[180px] flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="truncate text-sm font-bold text-white">{offer.offer_name || "—"}</p>
            {offer.is_primary === "yes" && <Star className="h-3.5 w-3.5 fill-amber-300 text-amber-300" />}
            {offer.sponsored === "yes" && <Pill tone="violet">{d.sponsored}</Pill>}
            <StatusPill status={offer.status} label={d.status[offer.status]} />
            {offer.live && <Pill tone="green">LIVE</Pill>}
          </div>
          <p className="mt-0.5 truncate text-[11px] text-foreground/45">
            {offer.network?.name || "—"} · {offer.service ? offer.service.title : d.unlinked} · /go/{offer.offer_slug}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-x-4 gap-y-1 text-right text-[11px] sm:grid-cols-6">
          <Metric label={d.clicks} value={m.clicks} />
          <Metric label={d.conversions} value={m.conversions} />
          <Metric label={d.revenue} value={m.revenueScalar ? formatMoney(m.revenue) : "N/A"} />
          <Metric label="EPC" value={m.epc ? formatMoney(m.epc) : "N/A"} />
          <Metric label="CR" value={pct(m.cr)} />
          <Metric label="CTR" value={pct(m.ctr)} />
        </div>
        <ChevronDown className={`h-4 w-4 shrink-0 text-foreground/40 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="space-y-4 border-t border-white/8 px-4 py-4">
          <div className="grid gap-3 md:grid-cols-2">
            <Field label={d.affiliateUrl}>
              <input className={inputClass} value={draft.affiliate_url} onChange={(e) => set("affiliate_url", e.target.value)} placeholder="https://" />
            </Field>
            <Field label={d.trackingUrl}>
              <input className={inputClass} value={draft.tracking_url} onChange={(e) => set("tracking_url", e.target.value)} placeholder="https://" />
            </Field>
            <Field label={d.network}>
              <select className={inputClass} value={draft.network} onChange={(e) => set("network", e.target.value)}>
                <option value="">—</option>
                {networks.map((n) => (
                  <option key={n._id} value={n._id}>{n.name}</option>
                ))}
              </select>
            </Field>
            <Field label={d.service}>
              <select className={inputClass} value={draft.service} onChange={(e) => set("service", e.target.value)}>
                <option value="">{d.unlinked}</option>
                {services.map((s) => (
                  <option key={s._id} value={s._id}>{s.label}</option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label={d.payout}>
                <input className={inputClass} inputMode="decimal" value={draft.payout} onChange={(e) => set("payout", e.target.value)} />
              </Field>
              <Field label="Model">
                <select className={inputClass} value={draft.payout_model} onChange={(e) => set("payout_model", e.target.value)}>
                  {PAYOUT_MODELS.map((model) => (
                    <option key={model} value={model}>{model.toUpperCase()}</option>
                  ))}
                </select>
              </Field>
              <Field label={d.quality}>
                <input className={inputClass} inputMode="numeric" value={draft.quality_score} onChange={(e) => set("quality_score", e.target.value)} />
              </Field>
            </div>
            <Field label={a.common.status}>
              <select className={inputClass} value={draft.status} onChange={(e) => set("status", e.target.value)}>
                {OFFER_STATUSES.map((status) => (
                  <option key={status} value={status}>{d.status[status]}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="flex flex-wrap gap-5">
            <label className="flex items-center gap-2 text-sm text-foreground/75">
              <Switch checked={draft.is_primary} onCheckedChange={(v) => set("is_primary", v)} /> {d.primary}
            </label>
            <label className="flex items-center gap-2 text-sm text-foreground/75">
              <Switch checked={draft.sponsored} onCheckedChange={(v) => set("sponsored", v)} /> {d.sponsored}
            </label>
          </div>

          <Field label={d.notes}>
            <textarea className={`${inputClass} min-h-[64px]`} value={draft.notes} onChange={(e) => set("notes", e.target.value)} />
          </Field>

          <p className="text-[11px] text-foreground/40">
            {d.lastChecked}: {offer.last_checked_at ? fmtDate(offer.last_checked_at, true) : d.never}
            {offer.health_note ? ` · ${offer.health_note}` : ""}
            {m.pending ? ` · ${d.pending}: ${m.pending}` : ""}
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className={primaryButton} disabled={Boolean(busy)} onClick={save}>
              {busy === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {a.common.save}
            </button>
            <button type="button" className={ghostButton} disabled={Boolean(busy)} onClick={check}>
              {busy === "check" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
              {busy === "check" ? d.checking : d.check}
            </button>
            {offer.affiliate_url && (
              <a href={offer.affiliate_url} target="_blank" rel="noopener noreferrer nofollow" className={ghostButton}>
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
            {offer.active !== "no" && (
              <button type="button" className={`${dangerButton} ml-auto`} disabled={Boolean(busy)} onClick={archive}>
                <Archive className="h-4 w-4" />
                {d.archive}
              </button>
            )}
          </div>

          <div className="rounded-xl border border-white/8 bg-white/3 p-3">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-foreground/45">{d.reportConversion}</p>
            <div className="flex flex-wrap items-end gap-2">
              <input className={`${inputClass} w-28`} inputMode="decimal" placeholder={d.convAmount} value={conversion.amount} onChange={(e) => setConversion((c) => ({ ...c, amount: e.target.value }))} />
              <select className={`${inputClass} w-24`} value={conversion.currency} onChange={(e) => setConversion((c) => ({ ...c, currency: e.target.value }))}>
                <option value="usd">USD</option>
                <option value="eur">EUR</option>
              </select>
              <select className={`${inputClass} w-40`} value={conversion.status} onChange={(e) => setConversion((c) => ({ ...c, status: e.target.value }))}>
                <option value="confirmed">{d.convApproved}</option>
                <option value="pending">{d.convPending}</option>
              </select>
              <button type="button" className={ghostButton} disabled={Boolean(busy)} onClick={report}>
                {busy === "conversion" ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
                {d.reportConversion}
              </button>
            </div>
          </div>
        </div>
      )}
    </li>
  );
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-[56px]">
      <p className="font-bold text-white">{value}</p>
      <p className="text-foreground/35">{label}</p>
    </div>
  );
}
