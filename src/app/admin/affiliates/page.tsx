"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, BadgeDollarSign, Handshake, Link2, Loader2, MousePointerClick, Percent, Plus, Search, Sparkles, Target } from "lucide-react";
import { api } from "@/lib/api";
import { useLang } from "@/lib/i18n/context";
import { useAdminDict } from "@/lib/i18n/admin-dict";
import { formatMoney } from "@/lib/money";
import { serviceTitle } from "@/lib/localize";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState, ErrorState, Field, LoadingBlock, PageHeader, Pill, Segmented, type SegmentedProps, StatCard, ghostButton, inputClass, primaryButton } from "@/components/admin/kit";
import { OfferRow, type ServiceOption } from "@/components/admin/marketplace/OfferRow";
import { pct, type MarketData, type MarketOffer } from "@/components/admin/marketplace/types";
import { DEFAULT_RANKING_WEIGHTS, type RankingWeights, type ServiceRecord } from "@/lib/types";

// Typed aliases: JSX generic arguments are not supported by the build pipeline.
const SegmentedRange = Segmented as (props: SegmentedProps<Range>) => React.JSX.Element;
const SegmentedTab = Segmented as (props: SegmentedProps<Tab>) => React.JSX.Element;

type Tab = "offers" | "networks" | "services" | "health" | "needsReview" | "broken" | "sponsored" | "ranking";
type Sort = "best" | "revenue" | "epc" | "cr" | "clicks" | "needs_review" | "broken";
type Range = "all" | "30" | "7";

const epcScalar = (offer: MarketOffer) => (offer.metrics.clicks ? offer.metrics.revenueScalar / offer.metrics.clicks : 0);

function sortOffers(list: MarketOffer[], sort: Sort): MarketOffer[] {
  const copy = [...list];
  const by = (fn: (o: MarketOffer) => number) => copy.sort((a, b) => fn(b) - fn(a));
  switch (sort) {
    case "revenue":
      return by((o) => o.metrics.revenueScalar);
    case "epc":
      return by(epcScalar);
    case "cr":
      return by((o) => o.metrics.cr || 0);
    case "clicks":
      return by((o) => o.metrics.clicks);
    case "needs_review":
      return by((o) => (o.status === "needs_review" ? 1 : 0));
    case "broken":
      return by((o) => (o.status === "broken" ? 1 : 0));
    default:
      // "Best": live first, then revenue, conversions and clicks — real data only.
      return copy.sort(
        (a, b) =>
          Number(b.live) - Number(a.live) ||
          b.metrics.revenueScalar - a.metrics.revenueScalar ||
          b.metrics.conversions - a.metrics.conversions ||
          b.metrics.clicks - a.metrics.clicks
      );
  }
}

/** Admin → Affiliate Marketplace (replaces the old Affiliate Manager). */
export default function AffiliateMarketplacePage() {
  const { lang } = useLang();
  const a = useAdminDict();
  const d = a.market;
  const [data, setData] = useState<MarketData | null>(null);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("offers");
  const [sort, setSort] = useState<Sort>("best");
  const [range, setRange] = useState<Range>("all");
  const [network, setNetwork] = useState("");
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(40);
  const [weights, setWeights] = useState<RankingWeights>(DEFAULT_RANKING_WEIGHTS);
  const [savingWeights, setSavingWeights] = useState(false);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ offer_name: "", network: "", service: "", affiliate_url: "" });

  const load = useCallback(async (nextRange: Range) => {
    const response = await api.get<MarketData>(`/api/admin/marketplace?range=${nextRange}`);
    if (!response.ok || !response.data) {
      console.error("[marketplace] load failed:", response.error);
      setError(String(response.error || "error"));
    } else {
      setData(response.data);
      setWeights(response.data.weights);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load(range);
  }, [load, range]);

  useEffect(() => {
    api.get<ServiceRecord[]>("/api/admin/services").then((response) => {
      if (!response.ok) {
        console.error("[marketplace] services load failed:", response.error);
        return;
      }
      setServices(
        (response.data || [])
          .map((service) => ({ _id: service._id, label: serviceTitle(service, lang) || service.slug }))
          .sort((x, y) => x.label.localeCompare(y.label))
      );
    });
  }, [lang]);

  useEffect(() => setLimit(40), [tab, sort, network, query]);

  const offers = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    let list = data.offers.filter((offer) => {
      if (network && offer.network?._id !== network) return false;
      if (tab === "needsReview" && offer.status !== "needs_review") return false;
      if (tab === "broken" && offer.status !== "broken") return false;
      if (tab === "sponsored" && offer.sponsored !== "yes") return false;
      if (!q) return true;
      return [offer.offer_name, offer.offer_slug, offer.service?.title, offer.affiliate_url].some((v) => (v || "").toLowerCase().includes(q));
    });
    if (tab === "health") {
      // Oldest / never checked first — that is what needs attention.
      list = [...list].sort((x, y) => (x.last_checked_at || "").localeCompare(y.last_checked_at || ""));
      return list;
    }
    return sortOffers(list, sort);
  }, [data, tab, sort, network, query]);

  const serviceGroups = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, { title: string; slug: string; offers: MarketOffer[] }>();
    for (const offer of data.offers) {
      if (!offer.service) continue;
      const entry = map.get(offer.service._id) || { title: offer.service.title, slug: offer.service.slug, offers: [] };
      entry.offers.push(offer);
      map.set(offer.service._id, entry);
    }
    return Array.from(map.values()).sort((x, y) => y.offers.length - x.offers.length || x.title.localeCompare(y.title));
  }, [data]);

  const saveWeights = async () => {
    if (weights.relevance < weights.payout) {
      toast.error(d.weightsHint);
      return;
    }
    setSavingWeights(true);
    const response = await api.put<RankingWeights>("/api/admin/marketplace", { weights });
    setSavingWeights(false);
    if (!response.ok) {
      toast.error(String(response.error || a.common.error));
      return;
    }
    toast.success(a.common.saved);
    if (response.data) setWeights(response.data);
  };

  const createOffer = async () => {
    if (!draft.offer_name.trim() || !draft.network) {
      toast.error(`${d.offerName} / ${d.network}`);
      return;
    }
    const response = await api.post("/api/admin/offers", {
      offer_name: draft.offer_name,
      network: draft.network,
      service: draft.service || null,
      affiliate_url: draft.affiliate_url,
    });
    if (!response.ok) {
      toast.error(String(response.error || a.common.error));
      return;
    }
    toast.success(a.common.saved);
    setCreating(false);
    setDraft({ offer_name: "", network: "", service: "", affiliate_url: "" });
    load(range);
  };

  if (loading) return <LoadingBlock />;
  if (error || !data) return <ErrorState>{error || a.common.error}</ErrorState>;

  const s = data.summary;
  const weightTotal = Object.values(weights).reduce((sum, value) => sum + (Number(value) || 0), 0);
  const tabs: { value: Tab; label: string; count?: number }[] = [
    { value: "offers", label: d.tabs.offers, count: s.offers },
    { value: "networks", label: d.tabs.networks, count: data.networks.length },
    { value: "services", label: d.tabs.services, count: s.services },
    { value: "health", label: d.tabs.health },
    { value: "needsReview", label: d.tabs.needsReview, count: s.needsReview },
    { value: "broken", label: d.tabs.broken, count: s.broken },
    { value: "sponsored", label: d.tabs.sponsored, count: s.sponsored },
    { value: "ranking", label: d.tabs.ranking },
  ];
  const offerList = tab === "offers" || tab === "health" || tab === "needsReview" || tab === "broken" || tab === "sponsored";

  return (
    <div>
      <PageHeader
        title={d.title}
        subtitle={d.subtitle}
        actions={
          <>
            <SegmentedRange
              value={range}
              onChange={(value) => {
                setLoading(true);
                setRange(value);
              }}
              options={(["all", "30", "7"] as Range[]).map((value) => ({ value, label: d.range[value] }))}
            />
            <button type="button" className={primaryButton} onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" />
              {d.addOffer}
            </button>
          </>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
        <StatCard label={d.offers} value={s.offers} icon={Handshake} />
        <StatCard label={d.live} value={s.live} icon={Link2} accent="text-emerald-300" />
        <StatCard label={d.clicks} value={s.clicks} icon={MousePointerClick} accent="text-amber-300" />
        <StatCard label={d.conversions} value={s.conversions} icon={Target} accent="text-cyan-300" />
        <StatCard label={d.revenue} value={s.conversions ? formatMoney(s.revenue) : "N/A"} icon={BadgeDollarSign} accent="text-emerald-300" />
        <StatCard label="EPC" value={s.epc && s.conversions ? formatMoney(s.epc) : "N/A"} icon={Sparkles} accent="text-violet-300" />
        <StatCard label="CR" value={pct(s.cr)} icon={Percent} accent="text-cyan-300" />
        <StatCard label="CTR" value={pct(s.ctr)} icon={Percent} accent="text-amber-200" />
      </div>

      <div className="rail no-scrollbar mb-4 flex">
        <SegmentedTab value={tab} onChange={setTab} options={tabs} />
      </div>

      {offerList && (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/35" />
              <input className={`${inputClass} pl-9`} placeholder={a.common.search} value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <select className={`${inputClass} w-auto`} value={network} onChange={(e) => setNetwork(e.target.value)}>
              <option value="">{d.network}: {a.common.all}</option>
              {data.networks.map((n) => (
                <option key={n._id} value={n._id}>{n.name} ({n.offers})</option>
              ))}
            </select>
          </div>
          {tab === "offers" && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {(Object.keys(d.sort) as Sort[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSort(key)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                    sort === key ? "border-[color:var(--neon-violet)] bg-violet-500/15 text-white" : "border-white/10 text-foreground/55 hover:text-white"
                  }`}
                >
                  {d.sort[key]}
                </button>
              ))}
            </div>
          )}
          {offers.length === 0 ? (
            <EmptyState>{a.common.empty}</EmptyState>
          ) : (
            <ul className="space-y-2">
              {offers.slice(0, limit).map((offer) => (
                <OfferRow key={`${offer._id}:${offer.status}:${offer.last_checked_at}`} offer={offer} networks={data.networks} services={services} onChanged={() => load(range)} />
              ))}
            </ul>
          )}
          {offers.length > limit && (
            <div className="mt-4 flex justify-center">
              <button type="button" className={ghostButton} onClick={() => setLimit((n) => n + 40)}>
                {a.catalog.loadMore} ({offers.length - limit})
              </button>
            </div>
          )}
        </>
      )}

      {tab === "networks" && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {data.networks.map((n) => (
            <div key={n._id} className="glass rounded-2xl p-4">
              <div className="flex items-center gap-2.5">
                <span className="h-3 w-3 rounded-full" style={{ background: n.accent_color || "#6366f1" }} />
                <p className="flex-1 font-display text-sm font-bold text-white">{n.name}</p>
                {n.active === "no" ? <Pill>{a.common.inactive}</Pill> : <Pill tone="green">{a.common.active}</Pill>}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                <div><p className="font-bold text-white">{n.offers}</p><p className="text-foreground/40">{d.offers}</p></div>
                <div><p className="font-bold text-white">{n.live}</p><p className="text-foreground/40">{d.live}</p></div>
                <div><p className="font-bold text-white">{n.clicks}</p><p className="text-foreground/40">{d.clicks}</p></div>
                <div><p className="font-bold text-white">{n.conversions}</p><p className="text-foreground/40">{d.conversions}</p></div>
                <div><p className="font-bold text-white">{n.conversions ? formatMoney(n.revenue) : "N/A"}</p><p className="text-foreground/40">{d.revenue}</p></div>
                <div><p className="font-bold text-white">{pct(n.cr)}</p><p className="text-foreground/40">CR</p></div>
              </div>
              {n.offers === 0 && <p className="mt-3 text-[11px] text-amber-300/80">{a.common.notConfigured}</p>}
            </div>
          ))}
        </div>
      )}

      {tab === "services" && (
        <ul className="space-y-2">
          {serviceGroups.map((group) => (
            <li key={group.slug} className="glass rounded-2xl px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="flex-1 truncate text-sm font-bold text-white">{group.title}</p>
                <span className="text-[11px] text-foreground/45">{group.offers.length} {d.offersCount}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {group.offers.map((offer) => (
                  <span key={offer._id} className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-2 py-1 text-[11px] text-foreground/70">
                    {offer.is_primary === "yes" && "★"} {offer.network?.name || "—"} · {d.status[offer.status]} · {offer.metrics.clicks} {d.clicks.toLowerCase()}
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}

      {tab === "ranking" && (
        <section className="glass-strong max-w-2xl rounded-2xl p-5">
          <h3 className="font-display text-base font-bold text-white">{d.weightsTitle}</h3>
          <p className="mt-1 text-xs text-foreground/50">{d.weightsHint}</p>
          <div className="mt-4 space-y-3">
            {(Object.keys(DEFAULT_RANKING_WEIGHTS) as (keyof RankingWeights)[]).map((key) => (
              <div key={key} className="flex items-center gap-3">
                <span className="w-32 text-sm text-foreground/75">{d.weights[key]}</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={weights[key]}
                  onChange={(e) => setWeights((w) => ({ ...w, [key]: Number(e.target.value) }))}
                  className="flex-1 accent-[#a855f7]"
                />
                <input
                  className={`${inputClass} w-20 text-right`}
                  inputMode="numeric"
                  value={weights[key]}
                  onChange={(e) => setWeights((w) => ({ ...w, [key]: Math.min(Math.max(Number(e.target.value) || 0, 0), 100) }))}
                />
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className={`text-sm ${weightTotal === 100 ? "text-foreground/55" : "text-amber-300"}`}>
              {d.sum}: {weightTotal}%{weightTotal !== 100 ? " (→ normalised to 100%)" : ""}
            </p>
            {weights.relevance < weights.payout && (
              <p className="flex items-center gap-1.5 text-xs text-rose-300">
                <AlertTriangle className="h-3.5 w-3.5" /> {d.weightsHint}
              </p>
            )}
            <div className="flex gap-2">
              <button type="button" className={ghostButton} onClick={() => setWeights(DEFAULT_RANKING_WEIGHTS)}>
                45/20/10/10/5/5/5
              </button>
              <button type="button" className={primaryButton} disabled={savingWeights} onClick={saveWeights}>
                {savingWeights && <Loader2 className="h-4 w-4 animate-spin" />}
                {a.common.save}
              </button>
            </div>
          </div>
        </section>
      )}

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="panel-solid border-white/10 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">{d.addOffer}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Field label={d.offerName}>
              <input className={inputClass} value={draft.offer_name} onChange={(e) => setDraft((c) => ({ ...c, offer_name: e.target.value }))} />
            </Field>
            <Field label={d.network}>
              <select className={inputClass} value={draft.network} onChange={(e) => setDraft((c) => ({ ...c, network: e.target.value }))}>
                <option value="">—</option>
                {data.networks.map((n) => (
                  <option key={n._id} value={n._id}>{n.name}</option>
                ))}
              </select>
            </Field>
            <Field label={d.service}>
              <select className={inputClass} value={draft.service} onChange={(e) => setDraft((c) => ({ ...c, service: e.target.value }))}>
                <option value="">{d.unlinked}</option>
                {services.map((service) => (
                  <option key={service._id} value={service._id}>{service.label}</option>
                ))}
              </select>
            </Field>
            <Field label={d.affiliateUrl}>
              <input className={inputClass} placeholder="https://" value={draft.affiliate_url} onChange={(e) => setDraft((c) => ({ ...c, affiliate_url: e.target.value }))} />
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className={ghostButton} onClick={() => setCreating(false)}>{a.common.cancel}</button>
            <button type="button" className={primaryButton} onClick={createOffer}>{a.common.create}</button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
