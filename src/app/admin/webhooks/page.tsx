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
            {status.payments.status === "ENABLED" ? <Pill tone="green">ENABLED</Pill> : <NotConfigured label={status.payments.status} />}
          </div>
          <dl className="space-y-2 text-xs">
            <Row label={d.stripeKey} value={status.payments.clientToken ? d.set : d.missing} />
            <Row label={d.stripeSecret} value={status.payments.webhookSecret ? d.set : d.missing} />
            <Row label={d.apiKey} value={status.payments.apiKey ? d.set : d.missing} />
            <Row label={d.endpoint} value={<code className="break-all">{status.payments.webhookUrl || "N/A"}</code>} />
            <Row label={d.events} value={status.payments.events.join(", ")} />
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

      <section className="glass mt-4 rounded-2xl p-5">
        <h3 className="mb-3 font-display text-sm font-bold text-white">{d.recent}</h3>
        {status.recentEvents.length === 0 ? (
          <p className="rounded-xl bg-white/4 px-3 py-4 text-center text-xs text-foreground/40">{d.noEvents}</p>
        ) : (
          <ul className="space-y-1.5">
            {status.recentEvents.map((event) => (
              <li key={event._id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-white/4 px-3 py-2 text-xs">
                <span className="text-foreground/40">{new Date(event.occurred_at || event.createdAt || "").toLocaleString()}</span>
                <span className="font-semibold uppercase text-white">{event.provider || "N/A"}</span>
                <code className="text-[color:var(--neon-cyan)]">{event.event_type || "N/A"}</code>
                <Pill tone={event.status === "processed" ? "green" : event.status === "failed" || event.status === "invalid_signature" ? "red" : "gray"}>
                  {(event.status || "N/A").toUpperCase()}
                </Pill>
                <span className="min-w-0 flex-1 truncate text-foreground/55">{event.error || event.result || ""}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
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
