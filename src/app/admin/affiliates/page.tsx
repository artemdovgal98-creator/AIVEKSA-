"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/i18n/context";
import { api } from "@/lib/api";
import { categoryName } from "@/lib/localize";
import { formatMoney, moneyIsZero, type Money } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  ExternalLink,
  Link2,
  Link2Off,
  Loader2,
  MousePointerClick,
  Pencil,
  Percent,
  Power,
  Plus,
  Search,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import type { AffiliateStatus, CategoryRecord, ConversionStatus, Currency } from "@/lib/types";

interface AffiliateRow {
  _id: string;
  name: string;
  slug: string;
  logo_url?: string;
  category: CategoryRecord | null;
  official_url: string;
  affiliate_url: string;
  affiliate_program_url: string;
  affiliate_network: string;
  commission: string;
  affiliate_status: AffiliateStatus;
  affiliate_notes: string;
  is_affiliate: "yes" | "no";
  active: "yes" | "no";
  views: number;
  clicks: number;
  /** Real commission confirmed / paid for this AI. */
  earned: Money;
  /** Reported but not yet approved by the network. */
  pendingEarned: Money;
}

interface EarningsTotals {
  earned: Money;
  pending: Money;
}

interface EarningsBlock {
  allTime: EarningsTotals;
  week: EarningsTotals;
  month: EarningsTotals;
  entries: number;
}

interface ConversionEntry {
  _id: string;
  earned_amount: number;
  currency: Currency;
  conversion_status: ConversionStatus;
  manual_entry: "yes" | "no";
  clicked_at: string;
}

interface AffiliateStats {
  affiliateTotal: number;
  affiliateToday: number;
  affiliateWeek: number;
  affiliateMonth: number;
  earnings: EarningsBlock;
  withProgram: number;
  withoutUrl: number;
  connected: number;
  topServices: AffiliateRow[];
  topCategories: { category: CategoryRecord | null; clicks: number }[];
}

const CONVERSION_STYLES: Record<ConversionStatus, string> = {
  paid: "bg-emerald-400/14 text-emerald-300",
  confirmed: "bg-[color:var(--neon-blue)]/16 text-[#8ab4ff]",
  pending: "bg-amber-400/14 text-amber-300",
  rejected: "bg-rose-500/14 text-rose-300",
};

const STATUS_STYLES: Record<AffiliateStatus, string> = {
  connected: "bg-emerald-400/14 text-emerald-300",
  pending: "bg-amber-400/14 text-amber-300",
  not_connected: "bg-white/8 text-foreground/60",
  rejected: "bg-rose-500/14 text-rose-300",
  not_available: "bg-white/5 text-foreground/35",
};

export default function AdminAffiliatesPage() {
  const { lang, t } = useLang();
  const a = t.admin.affiliate;
  const e = t.admin.earnings;

  const [rows, setRows] = useState<AffiliateRow[]>([]);
  const [stats, setStats] = useState<AffiliateStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | AffiliateStatus>("all");
  const [onlyWithProgram, setOnlyWithProgram] = useState(false);
  const [editing, setEditing] = useState<AffiliateRow | null>(null);
  const [draftUrl, setDraftUrl] = useState("");
  const [draftStatus, setDraftStatus] = useState<AffiliateStatus>("not_connected");
  const [draftNotes, setDraftNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Commission tracking
  const [earningsFor, setEarningsFor] = useState<AffiliateRow | null>(null);
  const [entries, setEntries] = useState<ConversionEntry[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [amountDraft, setAmountDraft] = useState("");
  const [currencyDraft, setCurrencyDraft] = useState<Currency>("usd");
  const [conversionDraft, setConversionDraft] = useState<ConversionStatus>("confirmed");
  const [savingEntry, setSavingEntry] = useState(false);

  const load = async () => {
    setLoading(true);
    const response = await api.get<{ services: AffiliateRow[]; stats: AffiliateStats }>("/api/admin/affiliates");
    if (!response.ok) {
      console.error("[admin/affiliates] failed to load:", response.error);
      toast.error(String(response.error || t.common.error));
      setRows([]);
      setStats(null);
    } else {
      setRows(response.data?.services || []);
      setStats(response.data?.stats || null);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (statusFilter !== "all" && row.affiliate_status !== statusFilter) return false;
      if (onlyWithProgram && !row.affiliate_program_url) return false;
      if (needle && !`${row.name} ${row.slug}`.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [rows, query, statusFilter, onlyWithProgram]);

  const openEditor = (row: AffiliateRow) => {
    setEditing(row);
    setDraftUrl(row.affiliate_url || "");
    setDraftStatus(row.affiliate_status || "not_connected");
    setDraftNotes(row.affiliate_notes || "");
  };

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    const trimmed = draftUrl.trim();

    const response = await api.put(`/api/admin/affiliates/${editing._id}`, {
      affiliate_url: trimmed,
      // A pasted link means "connected + enabled" unless the admin picked another state.
      affiliate_status: trimmed && draftStatus === "not_connected" ? "connected" : draftStatus,
      affiliate_notes: draftNotes,
      is_affiliate: trimmed ? "yes" : "no",
    });

    if (!response.ok) {
      console.error("[admin/affiliates] save failed:", response.error);
      toast.error(typeof response.error === "string" ? response.error : JSON.stringify(response.error));
      setSaving(false);
      return;
    }

    toast.success(trimmed ? a.savedHint : a.cleared);
    setSaving(false);
    setEditing(null);
    await load();
  };

  /** Enable / disable an already saved affiliate link without deleting it. */
  const toggleEnabled = async (row: AffiliateRow) => {
    const next = row.is_affiliate === "yes" ? "no" : "yes";
    const response = await api.put(`/api/admin/affiliates/${row._id}`, {
      affiliate_url: row.affiliate_url,
      affiliate_status: row.affiliate_status,
      is_affiliate: next,
    });
    if (!response.ok) {
      console.error("[admin/affiliates] toggle failed:", response.error);
      toast.error(String(response.error || t.common.error));
      return;
    }
    toast.success(next === "yes" ? a.enable : a.disable);
    load();
  };

  /* ---------- Commission tracking ---------- */

  const loadEntries = async (row: AffiliateRow) => {
    setEntriesLoading(true);
    const response = await api.get<{ entries: ConversionEntry[]; totals: EarningsTotals }>(
      `/api/admin/earnings?service=${row._id}`
    );
    if (!response.ok) {
      console.error("[admin/affiliates] failed to load earnings:", response.error);
      toast.error(String(response.error || t.common.error));
      setEntries([]);
    } else {
      setEntries(response.data?.entries || []);
    }
    setEntriesLoading(false);
  };

  const openEarnings = (row: AffiliateRow) => {
    setEarningsFor(row);
    setAmountDraft("");
    setCurrencyDraft("usd");
    setConversionDraft("confirmed");
    setEntries([]);
    loadEntries(row);
  };

  const addEntry = async () => {
    if (!earningsFor) return;
    const amount = Number(amountDraft.replace(",", "."));
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error(e.amount);
      return;
    }
    setSavingEntry(true);
    const response = await api.post("/api/admin/earnings", {
      service: earningsFor._id,
      earned_amount: amount,
      currency: currencyDraft,
      conversion_status: conversionDraft,
    });
    setSavingEntry(false);
    if (!response.ok) {
      console.error("[admin/affiliates] failed to add commission:", response.error);
      toast.error(typeof response.error === "string" ? response.error : JSON.stringify(response.error));
      return;
    }
    toast.success(e.added);
    setAmountDraft("");
    await loadEntries(earningsFor);
    load();
  };

  const updateEntryStatus = async (entry: ConversionEntry, status: ConversionStatus) => {
    if (!earningsFor) return;
    const response = await api.put(`/api/admin/earnings/${entry._id}`, {
      earned_amount: entry.earned_amount,
      currency: entry.currency,
      conversion_status: status,
    });
    if (!response.ok) {
      console.error("[admin/affiliates] failed to update commission:", response.error);
      toast.error(String(response.error || t.common.error));
      return;
    }
    toast.success(e.updated);
    await loadEntries(earningsFor);
    load();
  };

  const deleteEntry = async (entry: ConversionEntry) => {
    if (!earningsFor) return;
    const response = await api.delete(`/api/admin/earnings/${entry._id}`);
    if (!response.ok) {
      console.error("[admin/affiliates] failed to delete commission:", response.error);
      toast.error(String(response.error || t.common.error));
      return;
    }
    toast.success(e.removed);
    await loadEntries(earningsFor);
    load();
  };

  const entriesTotal = entries.reduce<Money>((acc, entry) => {
    if (entry.conversion_status === "confirmed" || entry.conversion_status === "paid") {
      acc[entry.currency] = Number(((acc[entry.currency] || 0) + entry.earned_amount).toFixed(2));
    }
    return acc;
  }, {});

  const emptyTotals: EarningsTotals = { earned: {}, pending: {} };
  const earningsBlock: EarningsBlock = stats?.earnings || {
    allTime: emptyTotals,
    week: emptyTotals,
    month: emptyTotals,
    entries: 0,
  };

  const statCards = stats
    ? [
        { label: a.affiliateClicks, value: stats.affiliateTotal, icon: MousePointerClick },
        { label: t.admin.stats.today, value: stats.affiliateToday, icon: MousePointerClick },
        { label: t.admin.stats.week, value: stats.affiliateWeek, icon: MousePointerClick },
        { label: t.admin.stats.month, value: stats.affiliateMonth, icon: MousePointerClick },
        { label: a.status.connected, value: stats.connected, icon: Link2 },
        { label: a.withoutUrl, value: stats.withoutUrl, icon: Link2Off },
      ]
    : [];

  return (
    <div className="space-y-5">
      <header>
        <h2 className="font-display text-lg font-bold text-white">{a.title}</h2>
        <p className="mt-1 text-sm text-foreground/55">{a.subtitle}</p>
      </header>

      {/* Общая комиссия / Заработано — реальные подтверждённые суммы */}
      {stats && (
        <section className="glass-strong relative overflow-hidden rounded-2xl p-5">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[color:var(--neon-violet)]/20 blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#4c6fff] to-[#a855f7]">
                <Wallet className="h-4.5 w-4.5 text-white" />
              </span>
              <div>
                <h3 className="font-display text-base font-bold text-white">{e.title}</h3>
                <p className="text-[11px] text-foreground/45">{e.subtitle}</p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                { label: e.allTime, value: earningsBlock.allTime.earned, big: true },
                { label: e.week, value: earningsBlock.week.earned, big: false },
                { label: e.month, value: earningsBlock.month.earned, big: false },
              ].map((card) => (
                <div key={card.label} className="rounded-2xl bg-white/5 px-4 py-3.5">
                  <p
                    className={`font-display font-extrabold ${
                      card.big
                        ? "bg-gradient-to-r from-[#8ab4ff] to-[#d8b4fe] bg-clip-text text-2xl text-transparent"
                        : "text-xl text-white"
                    }`}
                  >
                    {formatMoney(card.value)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-foreground/45">{card.label}</p>
                </div>
              ))}
            </div>
            {!moneyIsZero(earningsBlock.allTime.pending) && (
              <p className="mt-3 text-xs text-amber-300/85">
                {e.pending}: {formatMoney(earningsBlock.allTime.pending)}
              </p>
            )}
          </div>
        </section>
      )}

      {/* Affiliate Performance — real numbers only */}
      {stats && (
        <section>
          <h3 className="font-display mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-foreground/45">
            <Percent className="h-4 w-4 text-[color:var(--neon-cyan)]" />
            {a.performance}
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {statCards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="glass animate-fade-up rounded-2xl px-4 py-4">
                  <Icon className="mb-2 h-4 w-4 text-[#8ab4ff]" />
                  <p className="font-display text-2xl font-extrabold text-white">{card.value}</p>
                  <p className="mt-0.5 text-[11px] leading-tight text-foreground/45">{card.label}</p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="glass flex min-w-[200px] flex-1 items-center gap-2 rounded-xl px-3.5 py-2.5">
          <Search className="h-4 w-4 shrink-0 text-foreground/40" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t.common.search}
            className="w-full bg-transparent text-sm text-white placeholder:text-foreground/30 focus:outline-none"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as any)}
          aria-label={a.statusFilter}
          className="glass shrink-0 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-foreground/85 focus:outline-none"
        >
          {(["all", "connected", "pending", "not_connected", "not_available", "rejected"] as const).map((value) => (
            <option key={value} value={value} className="bg-[#161626] text-white">
              {a.status[value]}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => setOnlyWithProgram((value) => !value)}
          className={`shrink-0 rounded-xl px-3.5 py-2.5 text-[13px] font-semibold transition-all ${
            onlyWithProgram
              ? "bg-gradient-to-r from-[#4c6fff] to-[#a855f7] text-white"
              : "glass text-foreground/65 hover:text-white"
          }`}
        >
          {a.onlyWithProgram}
        </button>
      </div>

      <p className="text-sm text-foreground/50">
        {t.catalog.found}: <span className="font-bold text-white">{filtered.length}</span>
      </p>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="glass h-16 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass rounded-2xl px-6 py-14 text-center text-sm text-foreground/50">
          {t.admin.stats.noData}
        </div>
      ) : (
        <div className="glass overflow-x-auto rounded-2xl">
          <table className="w-full min-w-[1080px] text-left text-sm">
            <thead className="border-b border-white/8 text-xs uppercase tracking-wide text-foreground/40">
              <tr>
                <th className="px-4 py-3 font-semibold">{a.colAi}</th>
                <th className="px-4 py-3 font-semibold">{a.colProgram}</th>
                <th className="px-4 py-3 font-semibold">{a.colStatus}</th>
                <th className="px-4 py-3 font-semibold">{a.colUrl}</th>
                <th className="px-4 py-3 font-semibold">{a.colClicks}</th>
                <th className="px-4 py-3 font-semibold">{e.colEarned}</th>
                <th className="px-4 py-3 font-semibold">{a.colCommission}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row._id} className="border-b border-white/5 last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      {row.logo_url ? (
                        <img
                          src={row.logo_url}
                          alt=""
                          className="h-8 w-8 shrink-0 rounded-lg border border-white/10 bg-white/5 object-contain p-1"
                        />
                      ) : (
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/8 text-xs font-bold text-white">
                          {row.name.charAt(0)}
                        </span>
                      )}
                      <div className="min-w-0">
                        <Link href={`/ai/${row.slug}`} className="block font-semibold text-white hover:underline">
                          {row.name}
                        </Link>
                        <span className="text-[11px] text-foreground/40">
                          {row.category ? categoryName(row.category, lang) : "—"}
                        </span>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    {row.affiliate_program_url ? (
                      <a
                        href={row.affiliate_program_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-white/6 px-2.5 py-1.5 text-xs font-semibold text-[color:var(--neon-cyan)] transition-colors hover:bg-white/12"
                      >
                        {a.getLink}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-xs text-foreground/30">{a.noProgram}</span>
                    )}
                    {row.affiliate_network && (
                      <span className="mt-1 block text-[11px] text-foreground/35">{row.affiliate_network}</span>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={`rounded-md px-2 py-1 text-[11px] font-bold ${STATUS_STYLES[row.affiliate_status]}`}
                    >
                      {a.status[row.affiliate_status]}
                    </span>
                    {row.affiliate_url && row.is_affiliate === "no" && (
                      <span className="mt-1 block text-[11px] text-foreground/35">{a.disable}</span>
                    )}
                  </td>

                  <td className="max-w-[220px] px-4 py-3">
                    {row.affiliate_url ? (
                      <span className="block truncate text-xs text-foreground/70" title={row.affiliate_url}>
                        {row.affiliate_url}
                      </span>
                    ) : (
                      <span className="text-xs text-foreground/30">—</span>
                    )}
                  </td>

                  <td className="px-4 py-3 font-semibold text-white">{row.clicks}</td>

                  <td className="whitespace-nowrap px-4 py-3">
                    <span
                      className={`rounded-lg px-2 py-1 text-xs font-bold ${
                        moneyIsZero(row.earned)
                          ? "bg-white/6 text-foreground/40"
                          : "bg-emerald-400/14 text-emerald-300"
                      }`}
                    >
                      {formatMoney(row.earned)}
                    </span>
                    {!moneyIsZero(row.pendingEarned) && (
                      <span className="mt-1 block text-[11px] text-amber-300/80">
                        {e.pending}: {formatMoney(row.pendingEarned)}
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-xs text-foreground/60">{row.commission || "—"}</td>

                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      {row.affiliate_url && (
                        <a
                          href={row.affiliate_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={a.testLink}
                          className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/6 text-foreground/70 transition-colors hover:bg-white/12 hover:text-white"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                      {row.affiliate_url && (
                        <button
                          type="button"
                          onClick={() => toggleEnabled(row)}
                          title={row.is_affiliate === "yes" ? a.disable : a.enable}
                          className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
                            row.is_affiliate === "yes"
                              ? "bg-emerald-400/12 text-emerald-300 hover:bg-emerald-400/20"
                              : "bg-white/6 text-foreground/45 hover:bg-white/12"
                          }`}
                        >
                          <Power className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => openEarnings(row)}
                        title={e.manage}
                        className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-400/12 text-emerald-300 transition-colors hover:bg-emerald-400/22"
                      >
                        <Wallet className="h-4 w-4" />
                      </button>
                      <Link
                        href={`/admin/clicks?service=${row.slug}`}
                        title={a.viewClicks}
                        className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/6 text-foreground/70 transition-colors hover:bg-white/12 hover:text-white"
                      >
                        <MousePointerClick className="h-4 w-4" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => openEditor(row)}
                        className="flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#4c6fff] to-[#a855f7] px-3 text-xs font-bold text-white"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        {row.affiliate_url ? a.editUrl : a.addUrl}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Editor */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-6">
          <div className="glass-strong max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-3xl p-5 sm:rounded-3xl sm:p-7">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-display truncate text-lg font-bold text-white">{editing.name}</h2>
                <p className="truncate text-xs text-foreground/40">{editing.official_url}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/6 text-foreground/70 hover:bg-white/12 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {editing.affiliate_program_url && (
              <a
                href={editing.affiliate_program_url}
                target="_blank"
                rel="noopener noreferrer"
                className="glass glass-hover mb-4 flex items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-[color:var(--neon-cyan)]"
              >
                {a.getLink}
                <ExternalLink className="h-4 w-4" />
              </a>
            )}

            <form
              onSubmit={(event) => {
                event.preventDefault();
                save();
              }}
              className="space-y-4"
            >
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-foreground/45">
                  {a.colUrl}
                </label>
                <input
                  value={draftUrl}
                  onChange={(event) => setDraftUrl(event.target.value)}
                  placeholder="https://…"
                  autoFocus
                  className="w-full rounded-xl bg-white/5 px-4 py-3 text-sm text-white placeholder:text-foreground/25 focus:outline-none focus:ring-1 focus:ring-[color:var(--neon-blue)]/50"
                />
                <p className="mt-1.5 text-[11px] text-foreground/35">{a.savedHint}</p>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-foreground/45">
                  {a.colStatus}
                </label>
                <select
                  value={draftStatus}
                  onChange={(event) => setDraftStatus(event.target.value as AffiliateStatus)}
                  className="w-full rounded-xl bg-white/5 px-4 py-3 text-sm text-white focus:outline-none"
                >
                  {(["not_connected", "pending", "connected", "rejected", "not_available"] as const).map((value) => (
                    <option key={value} value={value} className="bg-[#161626]">
                      {a.status[value]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-foreground/45">
                  {a.notes}
                </label>
                <textarea
                  value={draftNotes}
                  onChange={(event) => setDraftNotes(event.target.value)}
                  rows={3}
                  className="w-full resize-y rounded-xl bg-white/5 px-4 py-3 text-sm text-white focus:outline-none"
                />
              </div>

              <div className="flex gap-3 pt-1">
                <Button
                  type="submit"
                  disabled={saving}
                  className="glow-primary h-12 flex-1 rounded-xl bg-gradient-to-r from-[#4c6fff] to-[#a855f7] font-bold text-white"
                >
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {a.save}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setEditing(null)}
                  className="h-12 rounded-xl text-foreground/60"
                >
                  {t.common.cancel}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Commission tracker — real reported amounts only */}
      {earningsFor && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-6">
          <div className="glass-strong max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-3xl p-5 sm:rounded-3xl sm:p-7">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-display truncate text-lg font-bold text-white">{earningsFor.name}</h2>
                <p className="text-xs text-foreground/40">{e.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setEarningsFor(null)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/6 text-foreground/70 hover:bg-white/12 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-5 rounded-2xl bg-gradient-to-r from-[#4c6fff]/18 to-[#a855f7]/18 px-4 py-3.5">
              <p className="font-display text-2xl font-extrabold text-white">{formatMoney(entriesTotal)}</p>
              <p className="mt-0.5 text-[11px] text-foreground/50">{e.colEarned}</p>
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                addEntry();
              }}
              className="space-y-3"
            >
              <div className="flex flex-wrap gap-2.5">
                <input
                  value={amountDraft}
                  onChange={(event) => setAmountDraft(event.target.value)}
                  inputMode="decimal"
                  placeholder={e.amount}
                  autoFocus
                  className="min-w-[120px] flex-1 rounded-xl bg-white/5 px-4 py-3 text-sm text-white placeholder:text-foreground/25 focus:outline-none focus:ring-1 focus:ring-[color:var(--neon-blue)]/50"
                />
                <select
                  value={currencyDraft}
                  onChange={(event) => setCurrencyDraft(event.target.value as Currency)}
                  aria-label={e.currency}
                  className="rounded-xl bg-white/5 px-3 py-3 text-sm font-semibold text-white focus:outline-none"
                >
                  <option value="usd" className="bg-[#161626]">USD $</option>
                  <option value="eur" className="bg-[#161626]">EUR €</option>
                </select>
                <select
                  value={conversionDraft}
                  onChange={(event) => setConversionDraft(event.target.value as ConversionStatus)}
                  aria-label={e.status}
                  className="rounded-xl bg-white/5 px-3 py-3 text-sm font-semibold text-white focus:outline-none"
                >
                  {(["pending", "confirmed", "paid", "rejected"] as const).map((value) => (
                    <option key={value} value={value} className="bg-[#161626]">
                      {e.statuses[value]}
                    </option>
                  ))}
                </select>
              </div>

              <Button
                type="submit"
                disabled={savingEntry}
                className="glow-primary h-12 w-full rounded-xl bg-gradient-to-r from-[#4c6fff] to-[#a855f7] font-bold text-white"
              >
                {savingEntry ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                {e.addEntry}
              </Button>
              <p className="text-[11px] leading-relaxed text-foreground/35">{e.hint}</p>
            </form>

            <div className="mt-6">
              <h3 className="font-display mb-2.5 text-xs font-bold uppercase tracking-wide text-foreground/45">
                {e.entries}
              </h3>
              {entriesLoading ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-foreground/40" />
                </div>
              ) : entries.length === 0 ? (
                <p className="rounded-xl bg-white/4 py-6 text-center text-sm text-foreground/40">{e.noEntries}</p>
              ) : (
                <ul className="space-y-2">
                  {entries.map((entry) => (
                    <li
                      key={entry._id}
                      className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl bg-white/4 px-3 py-2.5"
                    >
                      <span className="font-display text-sm font-bold text-white">
                        {formatMoney({ [entry.currency]: entry.earned_amount })}
                      </span>
                      <span
                        className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${CONVERSION_STYLES[entry.conversion_status]}`}
                      >
                        {e.statuses[entry.conversion_status]}
                      </span>
                      {entry.manual_entry === "yes" && (
                        <span className="rounded-md bg-white/8 px-2 py-0.5 text-[10px] font-semibold text-foreground/45">
                          {e.manualBadge}
                        </span>
                      )}
                      <span className="text-[11px] text-foreground/35">
                        {entry.clicked_at ? new Date(entry.clicked_at).toLocaleDateString() : "—"}
                      </span>
                      <div className="ml-auto flex items-center gap-1.5">
                        <select
                          value={entry.conversion_status}
                          onChange={(event) => updateEntryStatus(entry, event.target.value as ConversionStatus)}
                          aria-label={e.status}
                          className="rounded-lg bg-white/6 px-2 py-1.5 text-[11px] font-semibold text-foreground/80 focus:outline-none"
                        >
                          {(["pending", "confirmed", "paid", "rejected"] as const).map((value) => (
                            <option key={value} value={value} className="bg-[#161626]">
                              {e.statuses[value]}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => deleteEntry(entry)}
                          title={t.common.delete}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/12 text-rose-300 transition-colors hover:bg-rose-500/22"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
