"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/i18n/context";
import { useAdminDict } from "@/lib/i18n/admin-dict";
import { NotConfigured, StatusPill, fmtAmount, fmtDate } from "@/components/admin/kit";
import { api } from "@/lib/api";
import { categoryName } from "@/lib/localize";
import { formatMoney, moneyIsZero, type Money } from "@/lib/money";
import {
  Eye,
  Wallet,
  Link2,
  Link2Off,
  Loader2,
  MousePointerClick,
  Percent,
  Sparkles,
  Users,
  Activity,
  Repeat,
  ShoppingBag,
  Target,
  Handshake,
} from "lucide-react";
import type { CategoryRecord, ClickRecord, ServiceRecord } from "@/lib/types";

interface TopService {
  _id: string;
  name: string;
  slug: string;
  logo_url?: string;
  category: CategoryRecord | null;
  clicks: number;
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

interface Stats {
  paymentsConfigured: boolean;
  activeUsers: number;
  activeSubscriptions: number;
  ordersTotal: number;
  ordersPaid: number;
  revenue: Money;
  topPlans: { name: string; orders: number }[];
  recentPayments: SlimOrder[];
  failedPayments: SlimOrder[];
  affiliate: {
    services: number;
    clicks: number;
    conversions: number;
    revenue: Money;
    epc: Money | null;
    cr: number | null;
    ctr: number | null;
  };
  topOffers: { _id: string; name: string; network: string | null; clicks: number; conversions: number; revenue: Money; epc: Money | null; cr: number | null }[];
  servicesTotal: number;
  servicesActive: number;
  usersTotal: number;
  views: number;
  clicksTotal: number;
  clicksToday: number;
  clicksWeek: number;
  clicksMonth: number;
  earnings: EarningsBlock;
  withAffiliate: number;
  withoutAffiliate: number;
  ctr: number | null;
  topServices: TopService[];
  topCategories: { category: CategoryRecord | null; clicks: number }[];
  recentClicks: (ClickRecord & { service?: ServiceRecord | string | null })[];
}

export default function AdminDashboardPage() {
  const { lang, t } = useLang();
  const ad = useAdminDict();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        {error || t.common.error}
      </div>
    );
  }

  const dd = ad.dashboard;
  const st = t.admin.stats;
  const e = t.admin.earnings;
  const empty = { earned: {}, pending: {} };
  const earnings = stats.earnings || { allTime: empty, week: empty, month: empty, entries: 0 };
  const aff = stats.affiliate;
  const na = (value: number | null | undefined, suffix = "") => (value === null || value === undefined ? "N/A" : `${value}${suffix}`);
  const pct = (value: number | null | undefined) => (value === null || value === undefined ? "N/A" : `${(value * 100).toFixed(2)}%`);

  const kpis = [
    { label: st.users, value: stats.usersTotal, sub: `${dd.activeUsers}: ${stats.activeUsers}`, icon: Users, accent: "text-[#d8b4fe]", glow: "bg-[#a855f7]/20" },
    { label: st.views, value: stats.views, sub: `${st.ctr}: ${na(stats.ctr, "%")}`, icon: Eye, accent: "text-[#67e8f9]", glow: "bg-cyan-400/15" },
    { label: st.clicks, value: stats.clicksTotal, sub: `${st.today}: ${stats.clicksToday}`, icon: MousePointerClick, accent: "text-amber-300", glow: "bg-amber-400/15" },
    { label: dd.activeSubs, value: stats.activeSubscriptions, sub: `${dd.orders}: ${stats.ordersPaid} / ${stats.ordersTotal}`, icon: Repeat, accent: "text-violet-300", glow: "bg-violet-500/15" },
    { label: dd.revenue, value: stats.ordersPaid ? formatMoney(stats.revenue) : "N/A", sub: `${dd.commission}: ${formatMoney(earnings.allTime.earned)}`, icon: Wallet, accent: "text-emerald-300", glow: "bg-emerald-400/15" },
    { label: dd.conversions, value: aff.conversions, sub: `${dd.cr}: ${na(aff.cr, "%")}`, icon: Target, accent: "text-cyan-300", glow: "bg-[#4c6fff]/20" },
  ];

  const Row = ({ label, value, tone = "text-white" }: { label: string; value: React.ReactNode; tone?: string }) => (
    <div className="flex items-center justify-between gap-3 border-b border-white/5 py-2 last:border-0">
      <span className="text-[13px] text-foreground/55">{label}</span>
      <span className={`font-display text-sm font-bold ${tone}`}>{value}</span>
    </div>
  );

  const Card = ({ title, icon: Icon, accent, href, linkLabel, children }: { title: string; icon: typeof Users; accent: string; href?: string; linkLabel?: string; children: React.ReactNode }) => (
    <div className="min-w-0 rounded-2xl border border-white/6 bg-white/[0.03] p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-bold text-white">
          <Icon className={`h-4 w-4 ${accent}`} />
          {title}
        </h3>
        {href && (
          <Link href={href} className="text-xs font-semibold text-[color:var(--neon-cyan)] hover:underline">
            {linkLabel || "→"} →
          </Link>
        )}
      </div>
      {children}
    </div>
  );

  const noData = <p className="py-4 text-center text-xs text-foreground/40">{st.noData}</p>;
  const Count = ({ n }: { n: number }) => (
    <span className="shrink-0 rounded-md bg-white/8 px-1.5 py-0.5 text-[11px] font-bold text-foreground/80">{n}</span>
  );

  const orderList = (list: SlimOrder[]) =>
    list.length === 0 ? (
      noData
    ) : (
      <ul className="space-y-1">
        {list.slice(0, 5).map((order) => (
          <li key={order._id} className="flex flex-wrap items-center gap-x-2.5 gap-y-1 rounded-lg bg-white/4 px-2.5 py-1.5 text-[13px]">
            <span className="font-semibold text-white">{fmtAmount(order.amount, order.currency)}</span>
            <StatusPill status={order.status} label={ad.billing.statuses[order.status || ""]} />
            <span className="min-w-0 truncate text-xs text-foreground/50">{order.plan || order.user || "—"}</span>
            <span className="ml-auto text-[11px] text-foreground/35">{fmtDate(order.date, true)}</span>
          </li>
        ))}
      </ul>
    );

  console.log("[admin] dashboard rendered", { users: stats.usersTotal, clicks: stats.clicksTotal, conversions: aff.conversions });

  return (
    <section className="glass-strong animate-fade-up relative overflow-hidden rounded-3xl p-4 sm:p-6">
      <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-[color:var(--neon-violet)]/15 blur-3xl" aria-hidden />
      <div className="relative space-y-5">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-xl font-extrabold text-white sm:text-2xl">{dd.overview}</h1>
            <p className="text-xs text-foreground/45">{dd.overviewSub}</p>
          </div>
          {!stats.paymentsConfigured && <NotConfigured label={`Paddle · ${ad.common.notConfigured}`} />}
        </div>

        {/* KPI row — each metric appears exactly once */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {kpis.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <div key={kpi.label} className="relative overflow-hidden rounded-2xl bg-white/5 px-4 py-3.5">
                <div className={`pointer-events-none absolute -right-6 -top-6 h-16 w-16 rounded-full blur-2xl ${kpi.glow}`} aria-hidden />
                <Icon className={`mb-2 h-4.5 w-4.5 ${kpi.accent}`} />
                <p className="font-display truncate text-xl font-extrabold text-white sm:text-2xl">{kpi.value}</p>
                <p className="mt-0.5 text-[11px] font-medium text-foreground/60">{kpi.label}</p>
                <p className="mt-1 truncate text-[10.5px] text-foreground/40">{kpi.sub}</p>
              </div>
            );
          })}
        </div>
        {!stats.paymentsConfigured && <p className="-mt-2 text-xs text-amber-300/80">{dd.paymentsOff}</p>}

        {/* Logical detail cards */}
        <div className="grid gap-3 lg:grid-cols-3">
          <Card title={dd.traffic} icon={Activity} accent="text-amber-300" href="/admin/clicks" linkLabel={ad.menu.clicks}>
            <Row label={st.week} value={stats.clicksWeek} />
            <Row label={st.month} value={stats.clicksMonth} />
            <Row label={st.services} value={`${stats.servicesActive} / ${stats.servicesTotal}`} />
            <Row label={st.withAffiliate} value={<span className="inline-flex items-center gap-1"><Link2 className="h-3.5 w-3.5" />{stats.withAffiliate}</span>} tone="text-emerald-300" />
            <Row label={st.withoutAffiliate} value={<span className="inline-flex items-center gap-1"><Link2Off className="h-3.5 w-3.5" />{stats.withoutAffiliate}</span>} tone="text-rose-300" />
          </Card>

          <Card title={dd.money} icon={ShoppingBag} accent="text-emerald-300" href="/admin/orders" linkLabel={ad.menu.orders}>
            <Row label={`${dd.commission} · ${e.week}`} value={formatMoney(earnings.week.earned)} />
            <Row label={`${dd.commission} · ${e.month}`} value={formatMoney(earnings.month.earned)} />
            {!moneyIsZero(earnings.allTime.pending) && (
              <Row label={dd.pending} value={formatMoney(earnings.allTime.pending)} tone="text-amber-300" />
            )}
            <div className="mt-2">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-foreground/40">{dd.topPlans}</p>
              {stats.topPlans.length === 0 ? (
                noData
              ) : (
                <ul className="space-y-1">
                  {stats.topPlans.map((plan) => (
                    <li key={plan.name} className="flex items-center justify-between rounded-lg bg-white/4 px-2.5 py-1.5 text-[13px]">
                      <span className="truncate text-white">{plan.name}</span>
                      <Count n={plan.orders} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>

          <Card title={dd.affiliate} icon={Handshake} accent="text-cyan-300" href="/admin/affiliates" linkLabel={ad.menu.marketplace}>
            <Row label={dd.affServices} value={aff.services} />
            <Row label={dd.affClicks} value={aff.clicks} />
            <Row label={dd.affRevenue} value={aff.conversions ? formatMoney(aff.revenue) : "N/A"} tone="text-emerald-300" />
            <Row label={dd.epc} value={aff.epc && aff.conversions ? formatMoney(aff.epc) : "N/A"} />
            <Row label={`${dd.ctr} (affiliate)`} value={na(aff.ctr, "%")} />
          </Card>
        </div>

        {/* Leaders */}
        <div>
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-foreground/45">{dd.topLists}</h2>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <Card title={st.topServices} icon={Sparkles} accent="text-[#8ab4ff]">
              {stats.topServices.length === 0 ? (
                noData
              ) : (
                <ol className="space-y-1.5">
                  {stats.topServices.slice(0, 5).map((service, index) => (
                    <li key={service._id} className="flex items-center gap-2.5">
                      <span className="w-4 shrink-0 text-xs font-bold text-foreground/35">{index + 1}</span>
                      {service.logo_url && (
                        <img src={service.logo_url} alt="" className="h-6 w-6 shrink-0 rounded-md border border-white/10 bg-white/5 object-contain p-0.5" />
                      )}
                      <Link href={`/ai/${service.slug}`} className="min-w-0 flex-1 truncate text-[13px] font-medium text-white hover:underline">
                        {service.name}
                      </Link>
                      <Count n={service.clicks} />
                    </li>
                  ))}
                </ol>
              )}
            </Card>

            <Card title={st.topCategories} icon={Activity} accent="text-violet-300">
              {stats.topCategories.length === 0 ? (
                noData
              ) : (
                <ul className="space-y-1.5">
                  {stats.topCategories.slice(0, 5).map((entry) => (
                    <li key={entry.category?._id || "none"} className="flex items-center gap-2.5">
                      <span className="text-base">{entry.category?.icon}</span>
                      <span className="min-w-0 flex-1 truncate text-[13px] text-white">{categoryName(entry.category, lang)}</span>
                      <Count n={entry.clicks} />
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card title={dd.topOffers} icon={Target} accent="text-cyan-300">
              {stats.topOffers.length === 0 ? (
                noData
              ) : (
                <ul className="space-y-1.5">
                  {stats.topOffers.slice(0, 5).map((offer) => (
                    <li key={offer._id} className="rounded-lg bg-white/4 px-2.5 py-1.5">
                      <div className="flex items-center gap-2">
                        <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-white">{offer.name}</span>
                        <Count n={offer.clicks} />
                      </div>
                      <p className="mt-0.5 truncate text-[11px] text-foreground/45">
                        {offer.network || "—"} · {offer.conversions} conv. · EPC {offer.epc && offer.conversions ? formatMoney(offer.epc) : "N/A"} · CR {pct(offer.cr)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>

        {/* Recent activity */}
        <div>
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-foreground/45">{dd.activity}</h2>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <Card title={dd.recentPayments} icon={Wallet} accent="text-emerald-300" href="/admin/payments" linkLabel={ad.menu.payments}>
              {orderList(stats.recentPayments)}
            </Card>
            <Card title={dd.failedPayments} icon={Percent} accent="text-rose-300">
              {orderList(stats.failedPayments)}
            </Card>
            <Card title={st.recentClicks} icon={MousePointerClick} accent="text-amber-300" href="/admin/clicks" linkLabel={ad.menu.clicks}>
              {stats.recentClicks.length === 0 ? (
                noData
              ) : (
                <ul className="space-y-1">
                  {stats.recentClicks.slice(0, 5).map((click) => {
                    const service = typeof click.service === "object" ? click.service : null;
                    return (
                      <li key={click._id} className="flex items-center gap-2.5 rounded-lg bg-white/4 px-2.5 py-1.5 text-[13px]">
                        <span className="min-w-0 flex-1 truncate font-medium text-white">
                          {service?.name || service?.title_ru || service?.slug || "—"}
                        </span>
                        <span className="text-[11px] text-foreground/40">{[click.device, click.country].filter(Boolean).join(" · ") || "—"}</span>
                        <span className="text-[11px] text-foreground/35">{click.clicked_at ? fmtDate(click.clicked_at, true) : ""}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
