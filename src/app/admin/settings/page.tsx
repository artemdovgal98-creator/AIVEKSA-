"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAdminDict } from "@/lib/i18n/admin-dict";
import { useSystemStatus } from "@/components/admin/useSystemStatus";
import { EmptyState, NotConfigured, PageHeader, Pill, fmtDate } from "@/components/admin/kit";

interface AuditRow {
  _id: string;
  action?: string;
  target_type?: string;
  target_id?: string;
  details?: string;
  createdAt?: string;
  admin: { email?: string } | null;
}

export default function AdminSettingsPage() {
  const a = useAdminDict();
  const d = a.settings;
  const { status } = useSystemStatus();
  const [audit, setAudit] = useState<AuditRow[] | null>(null);

  useEffect(() => {
    api.get<AuditRow[]>("/api/admin/audit").then((response) => {
      if (!response.ok) console.error("[admin/settings] audit load failed:", response.error);
      setAudit(response.ok ? response.data || [] : []);
    });
  }, []);

  const flag = (on?: boolean) => (on ? <Pill tone="green">{a.common.configured}</Pill> : <NotConfigured />);

  return (
    <div className="space-y-5">
      <PageHeader title={d.title} subtitle={d.subtitle} />

      <section className="glass rounded-2xl p-5">
        <h3 className="mb-3 font-display text-sm font-bold text-white">{d.integrations}</h3>
        <ul className="space-y-2 text-sm">
          <li className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-foreground/65">{d.appUrl}</span>
            <code className="text-xs text-foreground/80">{status?.appUrl || "N/A"}</code>
          </li>
          <li className="flex items-center justify-between"><span className="text-foreground/65">Stripe</span>{flag(status?.stripe.configured)}</li>
          <li className="flex items-center justify-between"><span className="text-foreground/65">Telegram</span>{flag(status?.telegram.configured)}</li>
          <li className="flex items-center justify-between"><span className="text-foreground/65">Zernio</span>{flag(status?.zernio.configured)}</li>
        </ul>
        <div className="mt-4 space-y-1 text-xs text-foreground/50">
          <p>
            <Link href="/admin/plans" className="text-[color:var(--neon-cyan)] hover:underline">{a.menu.plans}</Link> — {d.plansLink}
          </p>
          <p>
            <Link href="/admin/affiliates" className="text-[color:var(--neon-cyan)] hover:underline">{a.menu.marketplace}</Link> — {d.rankingLink}
          </p>
        </div>
      </section>

      <section className="glass rounded-2xl p-5">
        <h3 className="mb-3 font-display text-sm font-bold text-white">{d.audit}</h3>
        {!audit ? (
          <p className="text-xs text-foreground/40">{a.common.loading}</p>
        ) : audit.length === 0 ? (
          <EmptyState>{a.common.empty}</EmptyState>
        ) : (
          <ul className="space-y-1.5">
            {audit.map((row) => (
              <li key={row._id} className="rounded-xl bg-white/4 px-3 py-2 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <Pill tone="violet">{row.action}</Pill>
                  <span className="text-foreground/60">{row.target_type}:{row.target_id?.slice(-6)}</span>
                  <span className="text-foreground/45">{row.admin?.email || "—"}</span>
                  <span className="ml-auto text-foreground/35">{fmtDate(row.createdAt, true)}</span>
                </div>
                {row.details && row.details !== "{}" && <p className="mt-1 break-all font-mono text-[10px] text-foreground/40">{row.details.slice(0, 300)}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
