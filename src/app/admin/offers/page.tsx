"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLang } from "@/lib/i18n/context";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Check,
  Copy,
  ExternalLink,
  Layers,
  Link2,
  Link2Off,
  Loader2,
  Plus,
  Power,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import type { AffiliateNetworkRecord, AffiliateOfferRecord, PayoutModel, ServiceRecord } from "@/lib/types";

interface NetworkRow extends AffiliateNetworkRecord {
  total: number;
  withUrl: number;
  bound: number;
}

type LinkFilter = "all" | "with" | "without";

const DEFAULT_ACCENT = "#7c8cff";

export default function AdminOffersPage() {
  const { t } = useLang();
  const m = t.admin.offerManager;

  const [networks, setNetworks] = useState<NetworkRow[]>([]);
  const [offers, setOffers] = useState<AffiliateOfferRecord[]>([]);
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeNetwork, setActiveNetwork] = useState<string>("");
  const [query, setQuery] = useState("");
  const [linkFilter, setLinkFilter] = useState<LinkFilter>("all");

  /** Draft affiliate URL per offer — only written to the database on "save". */
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string>("");
  const [copiedId, setCopiedId] = useState<string>("");
  const [creating, setCreating] = useState(false);
  const [newOffer, setNewOffer] = useState({ offer_name: "", external_id: "", affiliate_url: "" });

  const loadNetworks = useCallback(async () => {
    const response = await api.get<NetworkRow[]>("/api/admin/networks");
    if (!response.ok) {
      console.error("[admin/offers] failed to load networks:", response.error);
      toast.error(String(response.error || t.common.error));
      return;
    }
    setNetworks(response.data || []);
  }, [t.common.error]);

  const loadOffers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (activeNetwork) params.set("network", activeNetwork);
    if (query.trim()) params.set("q", query.trim());
    if (linkFilter !== "all") params.set("link", linkFilter);

    const response = await api.get<AffiliateOfferRecord[]>(`/api/admin/offers?${params.toString()}`);
    setLoading(false);
    if (!response.ok) {
      console.error("[admin/offers] failed to load offers:", response.error);
      toast.error(String(response.error || t.common.error));
      return;
    }
    const rows = response.data || [];
    setOffers(rows);
    setDrafts(Object.fromEntries(rows.map((offer) => [offer._id, offer.affiliate_url || ""])));
    console.log("[admin/offers] loaded", rows.length, "offers");
  }, [activeNetwork, query, linkFilter, t.common.error]);

  useEffect(() => {
    loadNetworks();
    api.get<ServiceRecord[]>("/api/admin/services").then((response) => {
      if (!response.ok) {
        console.error("[admin/offers] failed to load services:", response.error);
        return;
      }
      setServices(response.data || []);
    });
  }, [loadNetworks]);

  useEffect(() => {
    const timer = setTimeout(loadOffers, query ? 280 : 0);
    return () => clearTimeout(timer);
  }, [loadOffers, query]);

  const totals = useMemo(() => {
    const scoped = activeNetwork ? networks.filter((network) => network._id === activeNetwork) : networks;
    return scoped.reduce(
      (acc, network) => ({
        total: acc.total + network.total,
        withUrl: acc.withUrl + network.withUrl,
        bound: acc.bound + network.bound,
      }),
      { total: 0, withUrl: 0, bound: 0 }
    );
  }, [networks, activeNetwork]);

  const patchOffer = async (offer: AffiliateOfferRecord, body: Record<string, any>, successMessage: string) => {
    setSavingId(offer._id);
    const response = await api.put<AffiliateOfferRecord>(`/api/admin/offers/${offer._id}`, body);
    setSavingId("");
    if (!response.ok) {
      console.error("[admin/offers] update failed:", response.error);
      toast.error(String(response.error || t.common.error));
      return;
    }
    const updated = response.data;
    if (updated) {
      setOffers((current) => current.map((item) => (item._id === offer._id ? updated : item)));
      setDrafts((current) => ({ ...current, [offer._id]: updated.affiliate_url || "" }));
    }
    toast.success(successMessage);
    loadNetworks();
  };

  const saveLink = (offer: AffiliateOfferRecord) => {
    const url = (drafts[offer._id] || "").trim();
    return patchOffer(offer, { affiliate_url: url }, url ? m.saved : m.cleared);
  };

  const bindService = (offer: AffiliateOfferRecord, serviceId: string) =>
    patchOffer(offer, { service: serviceId }, serviceId ? m.bound : m.unbound);

  const toggleActive = (offer: AffiliateOfferRecord) => {
    const next = offer.active === "no" ? "yes" : "no";
    return patchOffer(offer, { active: next }, next === "yes" ? m.enabled : m.disabled);
  };

  const removeOffer = async (offer: AffiliateOfferRecord) => {
    if (!window.confirm(m.confirmDelete)) return;
    const response = await api.delete(`/api/admin/offers/${offer._id}`);
    if (!response.ok) {
      console.error("[admin/offers] delete failed:", response.error);
      toast.error(String(response.error || t.common.error));
      return;
    }
    setOffers((current) => current.filter((item) => item._id !== offer._id));
    toast.success(m.removed);
    loadNetworks();
  };

  const createOffer = async () => {
    const networkId = activeNetwork || networks[0]?._id || "";
    if (!newOffer.offer_name.trim() || !networkId) return;
    const response = await api.post<AffiliateOfferRecord>("/api/admin/offers", {
      ...newOffer,
      network: networkId,
      payout_model: "other",
      active: "yes",
      order_position: 999,
    });
    if (!response.ok) {
      console.error("[admin/offers] create failed:", response.error);
      toast.error(String(response.error || t.common.error));
      return;
    }
    toast.success(t.admin.form.saved);
    setNewOffer({ offer_name: "", external_id: "", affiliate_url: "" });
    setCreating(false);
    loadOffers();
    loadNetworks();
  };

  const copyLink = async (offer: AffiliateOfferRecord) => {
    const url = (offer.affiliate_url || "").trim();
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(offer._id);
      setTimeout(() => setCopiedId(""), 1600);
      toast.success(m.copied);
    } catch (err) {
      console.error("[admin/offers] clipboard failed:", err);
      toast.error(String(t.common.error));
    }
  };

  const accentOf = (offer: AffiliateOfferRecord): string => {
    const network = offer.network && typeof offer.network === "object" ? offer.network : null;
    return network?.accent_color || DEFAULT_ACCENT;
  };

  const networkNameOf = (offer: AffiliateOfferRecord): string => {
    const network = offer.network && typeof offer.network === "object" ? offer.network : null;
    return network?.name || "";
  };

  const serviceIdOf = (offer: AffiliateOfferRecord): string => {
    const service = offer.service;
    if (!service) return "";
    return typeof service === "object" ? service._id : service;
  };

  return (
    <div className="space-y-5">
      <header className="glass-strong rounded-3xl p-5 sm:p-6">
        <h2 className="font-display text-lg font-extrabold text-white sm:text-xl">{m.title}</h2>
        <p className="mt-1 max-w-3xl text-sm text-foreground/55">{m.subtitle}</p>
        <p className="mt-3 rounded-2xl bg-white/5 px-4 py-3 text-xs leading-relaxed text-foreground/50">{m.hint}</p>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard icon={Layers} label={m.totalOffers} value={totals.total} tone="from-[#4c6fff] to-[#7c5cff]" />
          <StatCard icon={Link2} label={m.withLink} value={totals.withUrl} tone="from-[#22c55e] to-[#14b8a6]" />
          <StatCard
            icon={Link2Off}
            label={m.withoutLink}
            value={Math.max(totals.total - totals.withUrl, 0)}
            tone="from-[#f59e0b] to-[#ef4444]"
          />
          <StatCard icon={Check} label={m.boundCount} value={totals.bound} tone="from-[#a855f7] to-[#ec4899]" />
        </div>
      </header>

      {/* Network split — the three networks the whole inventory is divided into. */}
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        <NetworkTab
          label={m.allNetworks}
          count={networks.reduce((sum, network) => sum + network.total, 0)}
          filled={networks.reduce((sum, network) => sum + network.withUrl, 0)}
          accent={DEFAULT_ACCENT}
          active={!activeNetwork}
          onClick={() => setActiveNetwork("")}
        />
        {networks.map((network) => (
          <NetworkTab
            key={network._id}
            label={network.name}
            count={network.total}
            filled={network.withUrl}
            accent={network.accent_color || DEFAULT_ACCENT}
            active={activeNetwork === network._id}
            onClick={() => setActiveNetwork(network._id)}
          />
        ))}
      </div>

      <div className="glass rounded-2xl p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/35" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={m.search}
              className="w-full rounded-xl bg-white/5 py-2.5 pl-10 pr-9 text-sm text-white placeholder:text-foreground/30 focus:outline-none focus:ring-1 focus:ring-[color:var(--neon-blue)]/50"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/35 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {(["all", "with", "without"] as LinkFilter[]).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setLinkFilter(value)}
              className={`rounded-xl px-3.5 py-2.5 text-xs font-bold transition-all ${
                linkFilter === value
                  ? "bg-gradient-to-r from-[#4c6fff] to-[#a855f7] text-white"
                  : "bg-white/5 text-foreground/55 hover:text-white"
              }`}
            >
              {value === "all" ? m.filterAll : value === "with" ? m.filterWith : m.filterWithout}
            </button>
          ))}

          <Button
            type="button"
            onClick={() => setCreating((value) => !value)}
            className="rounded-xl bg-gradient-to-r from-[#4c6fff] to-[#a855f7] text-white"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            {m.newOffer}
          </Button>
        </div>

        {creating && (
          <div className="mt-3 grid gap-2 rounded-2xl bg-white/5 p-3 sm:grid-cols-[2fr_1fr_2fr_auto]">
            <input
              value={newOffer.offer_name}
              onChange={(event) => setNewOffer({ ...newOffer, offer_name: event.target.value })}
              placeholder={m.offerName}
              className="rounded-xl bg-white/6 px-3.5 py-2.5 text-sm text-white placeholder:text-foreground/30 focus:outline-none focus:ring-1 focus:ring-[color:var(--neon-blue)]/50"
            />
            <input
              value={newOffer.external_id}
              onChange={(event) => setNewOffer({ ...newOffer, external_id: event.target.value })}
              placeholder={m.offerId}
              className="rounded-xl bg-white/6 px-3.5 py-2.5 text-sm text-white placeholder:text-foreground/30 focus:outline-none focus:ring-1 focus:ring-[color:var(--neon-blue)]/50"
            />
            <input
              value={newOffer.affiliate_url}
              onChange={(event) => setNewOffer({ ...newOffer, affiliate_url: event.target.value })}
              placeholder={m.linkPlaceholder}
              className="rounded-xl bg-white/6 px-3.5 py-2.5 text-sm text-white placeholder:text-foreground/30 focus:outline-none focus:ring-1 focus:ring-[color:var(--neon-blue)]/50"
            />
            <Button
              type="button"
              onClick={createOffer}
              disabled={!newOffer.offer_name.trim()}
              className="rounded-xl bg-emerald-500 text-white hover:bg-emerald-400"
            >
              {m.create}
            </Button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="glass flex items-center justify-center rounded-2xl py-16">
          <Loader2 className="h-6 w-6 animate-spin text-foreground/40" />
        </div>
      ) : offers.length === 0 ? (
        <div className="glass rounded-2xl py-16 text-center">
          <p className="font-display text-base font-bold text-white">{m.empty}</p>
          <p className="mt-1 text-sm text-foreground/45">{m.emptySub}</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {offers.map((offer) => {
            const accent = accentOf(offer);
            const draft = drafts[offer._id] ?? "";
            const dirty = draft.trim() !== (offer.affiliate_url || "").trim();
            const hasLink = Boolean((offer.affiliate_url || "").trim());
            const busy = savingId === offer._id;

            return (
              <li
                key={offer._id}
                className={`glass rounded-2xl border-l-2 p-3 transition-opacity ${offer.active === "no" ? "opacity-55" : ""}`}
                style={{ borderLeftColor: accent }}
              >
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
                  {/* Identity */}
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-white">
                      <span className="truncate">{offer.offer_name}</span>
                      {hasLink ? (
                        <Link2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                      ) : (
                        <Link2Off className="h-3.5 w-3.5 shrink-0 text-foreground/25" />
                      )}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span
                        className="rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                        style={{ backgroundColor: `${accent}26`, color: accent }}
                      >
                        {networkNameOf(offer)}
                      </span>
                      {offer.external_id && (
                        <span className="rounded-lg bg-white/6 px-2 py-0.5 font-mono text-[10px] text-foreground/55">
                          ID {offer.external_id}
                        </span>
                      )}
                      <span className="rounded-lg bg-white/6 px-2 py-0.5 text-[10px] font-semibold text-foreground/55">
                        {m.payoutModels[(offer.payout_model || "other") as PayoutModel]}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center gap-2">
                      <label className="text-[10px] font-semibold uppercase tracking-wide text-foreground/35">
                        {m.boundService}
                      </label>
                      <select
                        value={serviceIdOf(offer)}
                        onChange={(event) => bindService(offer, event.target.value)}
                        className="min-w-0 flex-1 rounded-lg bg-white/5 px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[color:var(--neon-blue)]/50"
                      >
                        <option value="" className="bg-[#161626]">
                          {m.noService}
                        </option>
                        {services.map((service) => (
                          <option key={service._id} value={service._id} className="bg-[#161626]">
                            {service.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Affiliate link input + save */}
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      value={draft}
                      onChange={(event) => setDrafts((current) => ({ ...current, [offer._id]: event.target.value }))}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") saveLink(offer);
                      }}
                      placeholder={m.linkPlaceholder}
                      className={`min-w-[180px] flex-1 rounded-xl bg-white/5 px-3.5 py-2.5 text-xs text-white placeholder:text-foreground/25 focus:outline-none focus:ring-1 ${
                        dirty ? "ring-1 ring-amber-400/50" : "focus:ring-[color:var(--neon-blue)]/50"
                      }`}
                    />

                    <button
                      type="button"
                      onClick={() => saveLink(offer)}
                      disabled={busy || !dirty}
                      title={m.save}
                      className={`flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-bold transition-all ${
                        dirty
                          ? "bg-gradient-to-r from-[#4c6fff] to-[#a855f7] text-white"
                          : "bg-white/6 text-foreground/35"
                      } disabled:cursor-not-allowed`}
                    >
                      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      {m.save}
                    </button>

                    <button
                      type="button"
                      onClick={() => copyLink(offer)}
                      disabled={!hasLink}
                      title={m.copy}
                      className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/6 text-foreground/55 transition-colors hover:text-white disabled:opacity-30"
                    >
                      {copiedId === offer._id ? (
                        <Check className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>

                    <a
                      href={hasLink ? `/go/offer/${offer._id}` : undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={m.open}
                      className={`flex h-9 w-9 items-center justify-center rounded-xl bg-white/6 transition-colors ${
                        hasLink ? "text-foreground/55 hover:text-white" : "pointer-events-none opacity-30"
                      }`}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>

                    <button
                      type="button"
                      onClick={() => toggleActive(offer)}
                      title={offer.active === "no" ? m.enable : m.disable}
                      className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
                        offer.active === "no"
                          ? "bg-white/6 text-foreground/45 hover:bg-white/12"
                          : "bg-emerald-400/12 text-emerald-300 hover:bg-emerald-400/20"
                      }`}
                    >
                      <Power className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => removeOffer(offer)}
                      title={m.remove}
                      className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-400/10 text-rose-300 transition-colors hover:bg-rose-400/20"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="glass rounded-2xl p-3.5">
      <span className={`mb-2 flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br ${tone}`}>
        <Icon className="h-4 w-4 text-white" />
      </span>
      <p className="font-display text-xl font-extrabold text-white">{value}</p>
      <p className="mt-0.5 text-[11px] text-foreground/45">{label}</p>
    </div>
  );
}

function NetworkTab({
  label,
  count,
  filled,
  accent,
  active,
  onClick,
}: {
  label: string;
  count: number;
  filled: number;
  accent: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex shrink-0 items-center gap-2.5 rounded-2xl px-4 py-2.5 text-sm font-bold transition-all ${
        active ? "text-white" : "glass text-foreground/60 hover:text-white"
      }`}
      style={active ? { backgroundColor: accent, boxShadow: `0 8px 24px -10px ${accent}` } : undefined}
    >
      <span className={active ? "" : "truncate"}>{label}</span>
      <span
        className={`rounded-lg px-2 py-0.5 text-[11px] font-extrabold ${
          active ? "bg-black/25 text-white" : "bg-white/8 text-foreground/60"
        }`}
      >
        {filled}/{count}
      </span>
    </button>
  );
}
