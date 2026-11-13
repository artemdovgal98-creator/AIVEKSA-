"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { useAdminDict } from "@/lib/i18n/admin-dict";

interface PackRow {
  id: string;
  credits: number;
  price: number;
  currency: "usd" | "eur";
  active: boolean;
}

const field = "w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-sm text-white outline-none focus:border-[color:var(--neon-cyan)]/60";

/** Admin → Credit System: edit the one-time credit packs sold on /pro. */
export function CreditPacksEditor() {
  const a = useAdminDict();
  const d = a.credits;
  const [packs, setPacks] = useState<PackRow[] | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<PackRow[]>("/api/admin/credit-packs").then((response) => {
      if (!response.ok) console.error("[admin/credit-packs] load failed:", response.error);
      setPacks(response.ok ? response.data || [] : []);
    });
  }, []);

  const update = (index: number, patch: Partial<PackRow>) =>
    setPacks((current) => (current || []).map((pack, i) => (i === index ? { ...pack, ...patch } : pack)));

  const save = async () => {
    if (!packs) return;
    setSaving(true);
    const response = await api.put<PackRow[]>("/api/admin/credit-packs", { packs });
    setSaving(false);
    if (!response.ok) {
      console.error("[admin/credit-packs] save failed:", response.error);
      toast.error(String(response.error || a.common.error));
      return;
    }
    setPacks(response.data || []);
    toast.success(a.common.saved);
  };

  return (
    <section className="glass rounded-2xl p-5">
      <div className="mb-4">
        <h3 className="font-display text-sm font-bold text-white">{d.packs}</h3>
        <p className="mt-1 text-xs text-foreground/50">{d.packsSub}</p>
      </div>
      {!packs ? (
        <p className="text-xs text-foreground/40">{a.common.loading}</p>
      ) : (
        <div className="space-y-2">
          <div className="hidden grid-cols-[1fr_1fr_1fr_90px_70px_36px] gap-2 px-1 text-[11px] uppercase tracking-wide text-foreground/40 sm:grid">
            <span>{d.packId}</span>
            <span>{d.packCredits}</span>
            <span>{d.packPrice}</span>
            <span />
            <span>{d.packActive}</span>
            <span />
          </div>
          {packs.map((pack, index) => (
            <div key={index} className="grid grid-cols-2 gap-2 rounded-xl bg-white/4 p-2 sm:grid-cols-[1fr_1fr_1fr_90px_70px_36px] sm:bg-transparent sm:p-0">
              <input className={field} value={pack.id} onChange={(e) => update(index, { id: e.target.value })} placeholder="starter" />
              <input className={field} type="number" min={1} value={pack.credits} onChange={(e) => update(index, { credits: Number(e.target.value) })} />
              <input className={field} type="number" min={0.5} step={0.01} value={pack.price} onChange={(e) => update(index, { price: Number(e.target.value) })} />
              <select className={field} value={pack.currency} onChange={(e) => update(index, { currency: e.target.value as PackRow["currency"] })}>
                <option value="usd">USD</option>
                <option value="eur">EUR</option>
              </select>
              <label className="flex items-center gap-2 text-xs text-foreground/60">
                <input type="checkbox" checked={pack.active} onChange={(e) => update(index, { active: e.target.checked })} />
                <span className="sm:hidden">{d.packActive}</span>
              </label>
              <button
                type="button"
                aria-label={a.common.delete}
                className="flex items-center justify-center rounded-lg text-rose-300/80 hover:bg-rose-500/10"
                onClick={() => setPacks((current) => (current || []).filter((_, i) => i !== index))}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-[color:var(--neon-cyan)] hover:bg-white/5"
              onClick={() => setPacks((current) => [...(current || []), { id: "", credits: 100, price: 9.99, currency: "usd", active: true }])}
            >
              <Plus className="h-3.5 w-3.5" />
              {d.addPack}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={save}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#4c6fff] to-[#a855f7] px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {a.common.save}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
