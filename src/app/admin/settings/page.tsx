"use client";

import Link from "next/link";
import { useAdminDict } from "@/lib/i18n/admin-dict";
import { useSystemStatus } from "@/components/admin/useSystemStatus";
import { PaymentSettingsCard } from "@/components/admin/PaymentSettingsCard";
import { SiteTagsCard } from "@/components/admin/SiteTagsCard";
import { NotConfigured, PageHeader, Pill } from "@/components/admin/kit";

export default function AdminSettingsPage() {
  const a = useAdminDict();
  const d = a.settings;
  const { status } = useSystemStatus();

  const flag = (on?: boolean) => (on ? <Pill tone="green">{a.common.configured}</Pill> : <NotConfigured />);

  return (
    <div className="space-y-5">
      <PageHeader title={d.title} subtitle={d.subtitle} />

      <section className="glass rounded-2xl p-5">
        <h3 className="mb-3 font-display text-sm font-bold text-white">{d.integrations}</h3>
        <ul className="space-y-2 text-sm">
          <li className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-foreground/65">{d.appUrl}</span>
            <code className="text-xs text-foreground/80">{status?.appUrl || "—"}</code>
          </li>
          <li className="flex items-center justify-between"><span className="text-foreground/65">NOWPayments</span>{flag(status?.payments.configured)}</li>
          <li className="flex items-center justify-between"><span className="text-foreground/65">Telegram</span>{flag(status?.telegram.configured)}</li>
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

      <PaymentSettingsCard />

      <SiteTagsCard />
    </div>
  );
}
