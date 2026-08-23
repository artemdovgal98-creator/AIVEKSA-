"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/i18n/context";
import { api } from "@/lib/api";
import { categoryName } from "@/lib/localize";
import {
  Eye,
  Link2,
  Link2Off,
  Loader2,
  MousePointerClick,
  Percent,
  Sparkles,
  Users,
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

interface Stats {
  servicesTotal: number;
  servicesActive: number;
  usersTotal: number;
  views: number;
  clicksTotal: number;
  clicksToday: number;
  clicksWeek: number;
  clicksMonth: number;
  withAffiliate: number;
  withoutAffiliate: number;
  ctr: number | null;
  topServices: TopService[];
  topCategories: { category: CategoryRecord | null; clicks: number }[];
  recentClicks: (ClickRecord & { service?: ServiceRecord | string | null })[];
}

export default function AdminDashboardPage() {
  const { lang, t } = useLang();
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

  const cards = [
    { label: t.admin.stats.services, value: stats.servicesTotal, icon: Sparkles, accent: "text-[#8ab4ff]" },
    { label: t.admin.stats.activeServices, value: stats.servicesActive, icon: Sparkles, accent: "text-emerald-300" },
    { label: t.admin.stats.users, value: stats.usersTotal, icon: Users, accent: "text-[#d8b4fe]" },
    { label: t.admin.stats.views, value: stats.views, icon: Eye, accent: "text-[#67e8f9]" },
    { label: t.admin.stats.clicks, value: stats.clicksTotal, icon: MousePointerClick, accent: "text-amber-300" },
    { label: t.admin.stats.today, value: stats.clicksToday, icon: MousePointerClick, accent: "text-amber-200" },
    { label: t.admin.stats.week, value: stats.clicksWeek, icon: MousePointerClick, accent: "text-amber-200" },
    { label: t.admin.stats.month, value: stats.clicksMonth, icon: MousePointerClick, accent: "text-amber-200" },
    { label: t.admin.stats.withAffiliate, value: stats.withAffiliate, icon: Link2, accent: "text-emerald-300" },
    { label: t.admin.stats.withoutAffiliate, value: stats.withoutAffiliate, icon: Link2Off, accent: "text-rose-300" },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="glass animate-fade-up rounded-2xl px-4 py-4">
              <Icon className={`mb-2 h-4.5 w-4.5 ${card.accent}`} />
              <p className="font-display text-2xl font-extrabold text-white">{card.value}</p>
              <p className="mt-0.5 text-[11px] leading-tight text-foreground/45">{card.label}</p>
            </div>
          );
        })}
      </div>

      <div className="glass flex items-center gap-3 rounded-2xl px-5 py-4">
        <Percent className="h-5 w-5 text-[color:var(--neon-cyan)]" />
        <div>
          <p className="font-display text-xl font-extrabold text-white">
            {stats.ctr === null ? "—" : `${stats.ctr}%`}
          </p>
          <p className="text-xs text-foreground/45">{t.admin.stats.ctr}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="glass rounded-2xl p-5">
          <h2 className="font-display mb-4 text-base font-bold text-white">{t.admin.stats.topServices}</h2>
          {stats.topServices.length === 0 ? (
            <p className="py-6 text-center text-sm text-foreground/40">{t.admin.stats.noData}</p>
          ) : (
            <ol className="space-y-2">
              {stats.topServices.map((service, index) => (
                <li key={service._id} className="flex items-center gap-3">
                  <span className="w-5 shrink-0 text-sm font-bold text-foreground/35">{index + 1}</span>
                  {service.logo_url && (
                    <img
                      src={service.logo_url}
                      alt=""
                      className="h-8 w-8 shrink-0 rounded-lg border border-white/10 bg-white/5 object-contain p-1"
                    />
                  )}
                  <Link href={`/ai/${service.slug}`} className="min-w-0 flex-1 truncate text-sm font-medium text-white hover:underline">
                    {service.name}
                  </Link>
                  <span className="shrink-0 rounded-lg bg-white/8 px-2 py-1 text-xs font-bold text-foreground/80">
                    {service.clicks}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="glass rounded-2xl p-5">
          <h2 className="font-display mb-4 text-base font-bold text-white">{t.admin.stats.topCategories}</h2>
          {stats.topCategories.length === 0 ? (
            <p className="py-6 text-center text-sm text-foreground/40">{t.admin.stats.noData}</p>
          ) : (
            <ul className="space-y-2">
              {stats.topCategories.map((entry) => (
                <li key={entry.category?._id || "none"} className="flex items-center gap-3">
                  <span className="text-lg">{entry.category?.icon}</span>
                  <span className="min-w-0 flex-1 truncate text-sm text-white">
                    {categoryName(entry.category, lang)}
                  </span>
                  <span className="shrink-0 rounded-lg bg-white/8 px-2 py-1 text-xs font-bold text-foreground/80">
                    {entry.clicks}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="glass rounded-2xl p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-base font-bold text-white">{t.admin.stats.recentClicks}</h2>
          <Link href="/admin/clicks" className="text-sm font-semibold text-[color:var(--neon-cyan)] hover:underline">
            {t.admin.clicks} →
          </Link>
        </div>
        {stats.recentClicks.length === 0 ? (
          <p className="py-6 text-center text-sm text-foreground/40">{t.admin.stats.noData}</p>
        ) : (
          <ul className="space-y-1.5">
            {stats.recentClicks.map((click) => {
              const service = typeof click.service === "object" ? click.service : null;
              return (
                <li
                  key={click._id}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-white/4 px-3 py-2 text-sm"
                >
                  <span className="font-medium text-white">{service?.name || "—"}</span>
                  <span className="text-xs text-foreground/40">{click.device || "—"}</span>
                  {click.country && <span className="text-xs text-foreground/40">{click.country}</span>}
                  {click.language && (
                    <span className="text-xs uppercase text-foreground/40">{click.language}</span>
                  )}
                  <span className="ml-auto text-xs text-foreground/35">
                    {click.clicked_at ? new Date(click.clicked_at).toLocaleString() : ""}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
