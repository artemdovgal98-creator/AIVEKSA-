"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CreditCard, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useAdminDict } from "@/lib/i18n/admin-dict";
import { NotConfigured, Pill } from "@/components/admin/kit";

interface PaymentSettings {
  provider: string;
  status: string;
  enabled: boolean;
  environment: "sandbox" | "production";
  clientTokenSet: boolean;
  webhookSecretSet: boolean;
  apiKeySet: boolean;
  proPriceId: string;
  packPrices: { id: string; credits: number; price: number; currency: string; priceId: string }[];
  webhookUrl: string | null;
}

type SecretKey = "clientToken" | "webhookSecret" | "apiKey";

const field =
  "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-xs text-white outline-none placeholder:text-foreground/30 focus:border-[color:var(--neon-cyan)]/60";

/** Admin → System Settings → Payments. Secrets are write-only — the API only says whether they are set. */
export function PaymentSettingsCard() {
  const a = useAdminDict();
  const d = a.paymentsCfg;
  const [data, setData] = useState<PaymentSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [environment, setEnvironment] = useState("");
  const [proPriceId, setProPriceId] = useState("");
  const [secrets, setSecrets] = useState<Record<SecretKey, string>>({ clientToken: "", webhookSecret: "", apiKey: "" });

  const apply = (next: PaymentSettings) => {
    setData(next);
    setEnabled(next.enabled);
    setProPriceId(next.proPriceId);
    setSecrets({ clientToken: "", webhookSecret: "", apiKey: "" });
  };

  useEffect(() => {
    api.get<PaymentSettings>("/api/admin/payments").then((response) => {
      if (!response.ok || !response.data) {
        console.error("[admin/payments] load failed:", response.error);
        return;
      }
      apply(response.data);
    });
  }, []);

  const save = async (clear: SecretKey[] = []) => {
    setSaving(true);
    const response = await api.put<PaymentSettings>("/api/admin/payments", {
      enabled,
      environment,
      proPriceId,
      ...secrets,
      clear,
    });
    setSaving(false);
    if (!response.ok || !response.data) {
      console.error("[admin/payments] save failed:", response.error);
      toast.error(String(response.error || a.common.error));
      return;
    }
    apply(response.data);
    toast.success(a.common.saved);
  };

  if (!data) {
    return (
      <section className="glass flex justify-center rounded-2xl p-5">
        <Loader2 className="h-5 w-5 animate-spin text-foreground/40" />
      </section>
    );
  }

  const secretRow = (key: SecretKey, label: string, isSet: boolean) => (
    <label className="block space-y-1">
      <span className="flex items-center justify-between gap-2 text-[11px] text-foreground/55">
        {label}
        {isSet && (
          <button type="button" onClick={() => save([key])} className="text-rose-300/80 hover:underline" disabled={saving}>
            {d.clear}
          </button>
        )}
      </span>
      <input
        type="password"
        autoComplete="off"
        className={field}
        value={secrets[key]}
        onChange={(e) => setSecrets((current) => ({ ...current, [key]: e.target.value }))}
        placeholder={isSet ? `•••••••• (${d.keep})` : d.empty}
      />
    </label>
  );

  return (
    <section className="glass rounded-2xl p-5">
      <div className="mb-1 flex items-center gap-2.5">
        <CreditCard className="h-5 w-5 text-[color:var(--neon-cyan)]" />
        <h3 className="flex-1 font-display text-sm font-bold text-white">{d.title}</h3>
        {data.status === "ENABLED" ? <Pill tone="green">ENABLED</Pill> : <NotConfigured label={data.status} />}
      </div>
      <p className="mb-4 text-xs text-foreground/50">{d.subtitle}</p>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex items-center gap-2 text-sm text-foreground/75">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          {d.enabled}
        </label>
        <label className="flex items-center gap-2 text-xs text-foreground/60">
          {d.environment}
          <select className={`${field} w-auto`} value={environment} onChange={(e) => setEnvironment(e.target.value)}>
            <option value="">{d.auto} ({data.environment})</option>
            <option value="production">production</option>
            <option value="sandbox">sandbox</option>
          </select>
        </label>
        {secretRow("clientToken", d.clientToken, data.clientTokenSet)}
        {secretRow("webhookSecret", d.webhookSecret, data.webhookSecretSet)}
        {secretRow("apiKey", d.apiKey, data.apiKeySet)}
        <label className="block space-y-1">
          <span className="text-[11px] text-foreground/55">{d.proPrice}</span>
          <input className={field} value={proPriceId} onChange={(e) => setProPriceId(e.target.value.trim())} placeholder="pri_…" />
        </label>
      </div>

      <div className="mt-4 space-y-1.5 text-xs">
        <p className="text-foreground/45">{d.packPrices}</p>
        <ul className="space-y-1">
          {data.packPrices.map((pack) => (
            <li key={pack.id} className="flex flex-wrap items-center gap-x-3 rounded-lg bg-white/4 px-3 py-1.5">
              <span className="font-semibold text-white">{pack.credits}</span>
              <span className="text-foreground/50">
                {pack.price.toFixed(2)} {pack.currency.toUpperCase()}
              </span>
              <code className="ml-auto break-all text-foreground/60">{pack.priceId || "N/A"}</code>
            </li>
          ))}
        </ul>
        <p className="pt-2 text-foreground/45">
          {d.webhookUrl}: <code className="break-all text-foreground/75">{data.webhookUrl || "N/A"}</code>
        </p>
      </div>

      <button
        type="button"
        disabled={saving}
        onClick={() => save()}
        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#4c6fff] to-[#a855f7] px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
      >
        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
        {d.save}
      </button>
    </section>
  );
}
