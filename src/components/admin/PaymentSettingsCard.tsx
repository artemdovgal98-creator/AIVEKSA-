"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CreditCard, ExternalLink, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useAdminDict } from "@/lib/i18n/admin-dict";
import { NotConfigured, Pill } from "@/components/admin/kit";

interface PaymentSettings {
  provider: string;
  status: string;
  enabled: boolean;
  sandbox: boolean;
  apiKeySet: boolean;
  ipnSecretSet: boolean;
  packPrices: { id: string; credits: number; price: number; currency: string }[];
  ipnUrl: string | null;
  recentEvents: { _id: string; event_type?: string; status?: string; result?: string; error?: string; occurred_at?: string; createdAt?: string }[];
}

type SecretKey = "apiKey" | "ipnSecret";

const field =
  "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-xs text-white outline-none placeholder:text-foreground/30 focus:border-[color:var(--neon-cyan)]/60";

/** Admin → System Settings → Payments (NOWPayments). Secrets are write-only — the API only says whether they are set. */
export function PaymentSettingsCard() {
  const a = useAdminDict();
  const d = a.paymentsCfg;
  const [data, setData] = useState<PaymentSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [sandbox, setSandbox] = useState(true);
  const [secrets, setSecrets] = useState<Record<SecretKey, string>>({ apiKey: "", ipnSecret: "" });

  const apply = (next: PaymentSettings) => {
    setData(next);
    setEnabled(next.enabled);
    setSandbox(next.sandbox);
    setSecrets({ apiKey: "", ipnSecret: "" });
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
    const response = await api.put<PaymentSettings>("/api/admin/payments", { enabled, sandbox, ...secrets, clear });
    setSaving(false);
    if (!response.ok || !response.data) {
      console.error("[admin/payments] save failed:", response.error);
      toast.error(String(response.error || a.common.error));
      return;
    }
    apply(response.data);
    toast.success(a.common.saved);
  };

  const testPayment = async () => {
    setTesting(true);
    const response = await api.post<{ paymentUrl: string }>("/api/admin/payments", { action: "test" });
    setTesting(false);
    if (!response.ok || !response.data?.paymentUrl) {
      console.error("[admin/payments] test payment failed:", response.error);
      toast.error(String(response.error || a.common.error));
      return;
    }
    window.open(response.data.paymentUrl, "_blank", "noopener,noreferrer");
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
        <label className="flex items-center gap-2 text-sm text-foreground/75">
          <input type="checkbox" checked={sandbox} onChange={(e) => setSandbox(e.target.checked)} />
          {d.sandboxToggle}
        </label>
        {secretRow("apiKey", d.apiKeyLabel, data.apiKeySet)}
        {secretRow("ipnSecret", d.ipnSecret, data.ipnSecretSet)}
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
            </li>
          ))}
        </ul>
        <p className="pt-2 text-foreground/45">
          {d.ipnUrl}: <code className="break-all text-foreground/75">{data.ipnUrl || "—"}</code>
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={() => save()}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#4c6fff] to-[#a855f7] px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {d.save}
        </button>
        <button
          type="button"
          disabled={testing || !data.apiKeySet}
          onClick={testPayment}
          title={!data.apiKeySet ? d.empty : undefined}
          className="glass glass-hover inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-foreground/80 disabled:opacity-40"
        >
          {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
          {d.testPayment}
        </button>
      </div>

      <div className="mt-5">
        <p className="mb-2 text-xs font-semibold text-foreground/55">{d.recentEvents}</p>
        {data.recentEvents.length === 0 ? (
          <p className="rounded-xl bg-white/4 px-3 py-4 text-center text-xs text-foreground/40">{d.noEvents}</p>
        ) : (
          <ul className="space-y-1.5">
            {data.recentEvents.map((event) => (
              <li key={event._id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-white/4 px-3 py-2 text-xs">
                <span className="text-foreground/40">{new Date(event.occurred_at || event.createdAt || "").toLocaleString()}</span>
                <code className="text-[color:var(--neon-cyan)]">{event.event_type || "—"}</code>
                <Pill tone={event.status === "processed" ? "green" : event.status === "failed" || event.status === "invalid_signature" ? "red" : "gray"}>
                  {(event.status || "—").toUpperCase()}
                </Pill>
                <span className="min-w-0 flex-1 truncate text-foreground/55">{event.error || ""}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
