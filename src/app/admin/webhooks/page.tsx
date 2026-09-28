"use client";

import Link from "next/link";
import { CreditCard, Send } from "lucide-react";
import { useAdminDict } from "@/lib/i18n/admin-dict";
import { useSystemStatus } from "@/components/admin/useSystemStatus";
import { ErrorState, LoadingBlock, NotConfigured, PageHeader, Pill, ghostButton } from "@/components/admin/kit";

export default function AdminWebhooksPage() {
  const a = useAdminDict();
  const d = a.webhooks;
  const { status, error } = useSystemStatus();
  if (error) return <ErrorState>{error}</ErrorState>;
  if (!status) return <LoadingBlock />;

  const ok = (value: boolean) => (value ? <Pill tone="green">{a.common.configured}</Pill> : <NotConfigured />);

  return (
    <div>
      <PageHeader title={d.title} subtitle={d.subtitle} />
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="glass rounded-2xl p-5">
          <div className="mb-3 flex items-center gap-2.5">
            <CreditCard className="h-5 w-5 text-[color:var(--neon-cyan)]" />
            <h3 className="flex-1 font-display text-sm font-bold text-white">{d.stripe}</h3>
            {ok(status.stripe.configured)}
          </div>
          <dl className="space-y-2 text-xs">
            <Row label={d.stripeKey} value={status.stripe.configured ? d.set : d.missing} />
            <Row label={d.stripeSecret} value={status.stripe.webhookSecret ? d.set : d.missing} />
            <Row label={d.endpoint} value={<code className="break-all">{status.stripe.webhookUrl || "N/A"}</code>} />
            <Row label={d.events} value={status.stripe.events.join(", ")} />
          </dl>
        </section>
        <section className="glass rounded-2xl p-5">
          <div className="mb-3 flex items-center gap-2.5">
            <Send className="h-5 w-5 text-[color:var(--neon-cyan)]" />
            <h3 className="flex-1 font-display text-sm font-bold text-white">{d.telegram}</h3>
            {ok(status.telegram.configured)}
          </div>
          <dl className="space-y-2 text-xs">
            <Row label="Bot" value={status.telegram.username ? `@${status.telegram.username}` : "N/A"} />
            <Row label={d.endpoint} value={<code className="break-all">{status.telegram.webhookUrl || "N/A"}</code>} />
          </dl>
          <Link href="/admin/telegram" className={`${ghostButton} mt-4`}>
            {d.manage} →
          </Link>
        </section>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-wrap justify-between gap-2 border-b border-white/5 pb-2 last:border-0">
      <dt className="text-foreground/45">{label}</dt>
      <dd className="text-right text-foreground/80">{value}</dd>
    </div>
  );
}
