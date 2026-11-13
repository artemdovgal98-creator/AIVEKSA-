"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/i18n/context";
import { useAdminDict } from "@/lib/i18n/admin-dict";
import { NotConfigured, fmtDate } from "@/components/admin/kit";
import { DailyChart, type DailyRow } from "@/components/admin/DailyChart";
import { api } from "@/lib/api";
import { categoryName } from "@/lib/localize";
import { formatMoney, type Money } from "@/lib/money";
import {
  AlertTriangle,
  Eye,
  Wallet,
  Link2,
  Link2Off,
  Loader2,
  MousePointerClick,
  Sparkles,
  Users,
  Activity,
  Target,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { CategoryRecord } from "@/lib/types";

interface Period {
  clicks: number;
  unique: number;
}

interface SlimOrder {
  _id: string;
  order_number?: string;
  amount?: number;
  currency?: string;
  status?: string;
  date?: string;
  user?: string | null;
  plan?: string | null;
}

interface RecentClick {
  _id: string;
  name: string;
  country: string;
  device: string;
  clicked_at: string;
}

interface SuspiciousGroup {
  ip: string;
  count: number;
  firstAt: string;
  lastAt: string;
}

interface Stats {
  paymentsConfigured: boolean;
  usersTotal: number;
  activeUsers: number;
  views: number;
  servicesTotal: number;
  servicesActive: number;
  withAffiliate: number;
  withoutAffiliate: number;
  periods: { today: Period; yesterday: Period; week: Period; month: Period };
  daily: DailyRow[];
  money: { revenue: Money; pending: Money; conversions: number; epc: Money | null; cr: number | null };
  top10: { _id: string; name: string; slug?: string; logo_url?: string; clicks: number; revenue: Money }[];
  topCategories: { category: CategoryRecord | null; clicks: number }[];
  recentClicks: RecentClick[];
  suspicious: { count: number; groups: SuspiciousGroup[] };
  payments: SlimOrder[];
}

export default function AdminDashboardPage() {
  const { lang } = useLang();
  const ad = useAdminDict();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAllSuspicious, setShowAllSuspicious] = useState(false);

  useEffect(() => {
    api.get<Stats>("/api/admin/stats").then((response) => {
      if (!response.ok) {
        console.error("[admin] failed to load stats:", response.error);
        setError(String(response.error || "error"));
      } else {
        setStats(response.data || null);
      }
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-foreground/40" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="glass rounded-2xl px-6 py-12 text-center text-sm text-rose-300">
        {error || "Error"}
      </div>
    );
  }

  const dd = ad.dashboard;

  console.log("[admin] dashboard rendered", { users: stats.usersTotal, clicksToday: stats.periods.today.clicks, suspicious: stats.suspicious.count });

  const periodTiles: { label: string; period: Period }[] = [
    { label: dd.today, period: stats.periods.today },
    { label: dd.yesterday, period: stats.periods.yesterday },
    { label: dd.week, period: stats.periods.week },
    { label: dd.month, period: stats.periods.month },
  ];

  const moneyTiles: { label: string; value: string }[] = [
    { label: dd.revenue, value: formatMoney(stats.money.revenue) },
    { label: dd.pending, value: formatMoney(stats.money.pending) },
    { label: dd.conversions, value: String(stats.money.conversions) },
    { label: dd.epc, value: formatMoney(stats.money.epc) },
    { label: dd.cr, value: stats.money.cr === null ? "—" : `${stats.money.cr.toFixed(2)}%` },
  ];

  const suspiciousGroups = showAllSuspicious ? stats.suspicious.groups : stats.suspicious.groups.slice(0, 5);

  return (
    <section className="glass-strong animate-fade-up relative overflow-hidden rounded-3xl p-4 sm:p-6">
      <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-[color:var(--neon-violet)]/15 blur-3xl" aria-hidden />
      <div className="relative space-y-5">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-display text-xl font-extrabold text-white sm:text-2xl">{dd.overview}</h1>
            <p className="text-xs text-foreground/45">{dd.overviewSub}</p>
          </div>
          {!stats.paymentsConfigured && <NotConfigured label={ad.common.notConfigured} />}
        </div>
        {!stats.paymentsConfigured && <p className="-mt-3 text-xs text-amber-300/80">{dd.paymentsOff}</p>}

        {/* Period row — transitions + unique, today / yesterday / 7d / 30d */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {periodTiles.map((tile) => (
            <div key={tile.label} className="relative overflow-hidden rounded-2xl bg-white/5 px-4 py-3.5">
              <div className="pointer-events-none absolute -right-6 -top-6 h-16 w-16 rounded-full bg-[#4c6fff]/15 blur-2xl" aria-hidden />
              <p className="text-[11px] font-bold uppercase tracking-wide text-foreground/50">{tile.label}</p>
              <p className="font-display mt-1 truncate text-2xl font-extrabold text-white sm:text-3xl">{tile.period.clicks}</p>
              <p className="mt-0.5 truncate text-[11px] text-foreground/45">
                {dd.unique}: {tile.period.unique}
              </p>
            </div>
          ))}
        </div>

        {/* Users & views — one small row */}
        <div className="glass flex flex-wrap items-center gap-x-6 gap-y-1 rounded-xl px-4 py-2.5 text-xs text-foreground/60">
          <span className="inline-flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-[#d8b4fe]" />
            <b className="text-white">{stats.usersTotal}</b> {dd.users} · {stats.activeUsers} {dd.activeUsers}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Eye className="h-3.5 w-3.5 text-[#67e8f9]" />
            <b className="text-white">{stats.views}</b> {dd.views}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Link2 className="h-3.5 w-3.5 text-emerald-300" />
            {stats.servicesActive}/{stats.servicesTotal}
          </span>
          <span className="inline-flex items-center gap-1.5 text-foreground/45">
            <Link2Off className="h-3.5 w-3.5" />
            {stats.withAffiliate} / {stats.withoutAffiliate}
          </span>
        </div>

        {/* Daily breakdown */}
        <div className="min-w-0 rounded-2xl border border-white/6 bg-white/[0.03] p-4">
          <h3 className="mb-0.5 flex items-center gap-2 text-sm font-bold text-white">
            <Activity className="h-4 w-4 text-amber-300" />
            {dd.dailyBreakdown}
          </h3>
          <p className="mb-3 text-[11px] text-foreground/45">{dd.dailyBreakdownSub}</p>
          <DailyChart data={stats.daily} labels={dd} />
        </div>

        {/* Money */}
        <div className="min-w-0 rounded-2xl border border-white/6 bg-white/[0.03] p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
            <Wallet className="h-4 w-4 text-emerald-300" />
            {dd.money}
          </h3>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
            {moneyTiles.map((tile) => (
              <div key={tile.label} className="rounded-xl bg-white/4 px-3 py-2.5">
                <p className="font-display truncate text-base font-extrabold text-white">{tile.value}</p>
                <p className="mt-0.5 truncate text-[10.5px] text-foreground/45">{tile.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Top-10 + categories */}
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="min-w-0 rounded-2xl border border-white/6 bg-white/[0.03] p-4">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-white">
              <Sparkles className="h-4 w-4 text-[#8ab4ff]" />
              {dd.top10}
            </h3>
            {stats.top10.length === 0 ? (
              <p className="py-4 text-center text-xs text-foreground/40">{ad.common.empty}</p>
            ) : (
              <ol className="space-y-1.5">
                {stats.top10.map((service, index) => (
                  <li key={service._id} className="flex items-center gap-2.5">
                    <span className="w-4 shrink-0 text-xs font-bold text-foreground/35">{index + 1}</span>
                    {service.logo_url && (
                      <img src={service.logo_url} alt="" className="h-6 w-6 shrink-0 rounded-md border border-white/10 bg-white/5 object-contain p-0.5" />
                    )}
                    <Link href={`/ai/${service.slug}`} className="min-w-0 flex-1 truncate text-[13px] font-medium text-white hover:underline">
                      {service.name}
                    </Link>
                    <span className="shrink-0 text-[11px] text-emerald-300">{formatMoney(service.revenue)}</span>
                    <span className="shrink-0 rounded-md bg-white/8 px-1.5 py-0.5 text-[11px] font-bold text-foreground/80">{service.clicks}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <div className="min-w-0 rounded-2xl border border-white/6 bg-white/[0.03] p-4">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-white">
              <Activity className="h-4 w-4 text-violet-300" />
              {dd.topCategories}
            </h3>
            {stats.topCategories.length === 0 ? (
              <p className="py-4 text-center text-xs text-foreground/40">{ad.common.empty}</p>
            ) : (
              <ul className="space-y-1.5">
                {stats.topCategories.map((entry) => (
                  <li key={entry.category?._id || "none"} className="flex items-center gap-2.5">
                    <span className="text-base">{entry.category?.icon}</span>
                    <span className="min-w-0 flex-1 truncate text-[13px] text-white">{categoryName(entry.category, lang)}</span>
                    <span className="shrink-0 rounded-md bg-white/8 px-1.5 py-0.5 text-[11px] font-bold text-foreground/80">{entry.clicks}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Recent clicks */}
        <div className="min-w-0 rounded-2xl border border-white/6 bg-white/[0.03] p-4">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-white">
            <MousePointerClick className="h-4 w-4 text-amber-300" />
            {dd.recentClicks}
          </h3>
          {stats.recentClicks.length === 0 ? (
            <p className="py-4 text-center text-xs text-foreground/40">{ad.common.empty}</p>
          ) : (
            <ul className="space-y-1">
              {stats.recentClicks.map((click) => (
                <li key={click._id} className="flex flex-wrap items-center gap-x-2.5 gap-y-1 rounded-lg bg-white/4 px-2.5 py-1.5 text-[13px]">
                  <span className="min-w-0 break-words font-medium text-white">{click.name}</span>
                  <span className="text-[11px] text-foreground/40">{[click.device, click.country].filter(Boolean).join(" · ") || "—"}</span>
                  <span className="ml-auto shrink-0 text-[11px] text-foreground/35">{click.clicked_at ? fmtDate(click.clicked_at, true) : ""}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Suspicious clicks */}
        <div className="min-w-0 rounded-2xl border border-white/6 bg-white/[0.03] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-sm font-bold text-white">
              <AlertTriangle className="h-4 w-4 text-rose-300" />
              {dd.suspicious}: <span className="text-rose-300">{stats.suspicious.count}</span>
            </h3>
            {stats.suspicious.groups.length > 5 && (
              <button
                type="button"
                onClick={() => setShowAllSuspicious((v) => !v)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--neon-cyan)] hover:underline"
              >
                {showAllSuspicious ? dd.suspiciousHideAll : dd.suspiciousShowAll}
                {showAllSuspicious ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
            )}
          </div>
          <p className="mt-1 text-[11px] text-foreground/45">{dd.suspiciousHint}</p>
          {suspiciousGroups.length === 0 ? (
            <p className="py-3 text-center text-xs text-foreground/40">{dd.suspiciousNone}</p>
          ) : (
            <ul className="mt-2 space-y-1">
              {suspiciousGroups.map((group) => (
                <li key={group.ip} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-rose-500/5 px-2.5 py-1.5 text-[12px]">
                  <code className="text-foreground/70">{group.ip}</code>
                  <span className="font-bold text-rose-300">{group.count}</span>
                  <span className="ml-auto text-[11px] text-foreground/35">
                    {fmtDate(group.firstAt, true)} → {fmtDate(group.lastAt, true)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Payments — merged, shown only when there is data */}
        {stats.payments.length > 0 && (
          <div className="min-w-0 rounded-2xl border border-white/6 bg-white/[0.03] p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                <Target className="h-4 w-4 text-cyan-300" />
                {dd.payments}
              </h3>
              <Link href="/admin/payments" className="text-xs font-semibold text-[color:var(--neon-cyan)] hover:underline">
                {ad.menu.payments} →
              </Link>
            </div>
            <ul className="space-y-1">
              {stats.payments.map((order) => (
                <li key={order._id} className="flex flex-wrap items-center gap-x-2.5 gap-y-1 rounded-lg bg-white/4 px-2.5 py-1.5 text-[13px]">
                  <span className="font-semibold text-white">{formatMoney({ [order.currency || "usd"]: order.amount || 0 } as Money)}</span>
                  <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase ${order.status === "paid" ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" : order.status === "failed" ? "border-rose-400/30 bg-rose-400/10 text-rose-300" : "border-white/12 bg-white/5 text-foreground/55"}`}>
                    {order.status || "—"}
                  </span>
                  <span className="min-w-0 truncate text-xs text-foreground/50">{order.plan || order.user || "—"}</span>
                  <span className="ml-auto shrink-0 text-[11px] text-foreground/35">{fmtDate(order.date, true)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
