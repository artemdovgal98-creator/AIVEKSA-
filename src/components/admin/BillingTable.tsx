"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAdminDict } from "@/lib/i18n/admin-dict";
import { EmptyState, ErrorState, LoadingBlock, NotConfigured, PageHeader, Pill, StatusPill, fmtAmount, fmtDate } from "@/components/admin/kit";
import { CREDIT_TRANSACTION_TYPES, ORDER_STATUSES, SUBSCRIPTION_STATUSES } from "@/lib/types";

export type BillingType = "orders" | "subscriptions" | "transactions" | "payments";

interface Row {
  _id: string;
  user: { email?: string; name?: string } | null;
  plan: { name?: string } | null;
  [key: string]: any;
}

/** Read-only real billing records. Nothing is shown that the database does not contain. */
export function BillingTable({ type }: { type: BillingType }) {
  const a = useAdminDict();
  const b = a.billing;
  const [rows, setRows] = useState<Row[]>([]);
  const [configured, setConfigured] = useState(true);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams({ type, ...(status ? { status } : {}) });
    api.get<{ rows: Row[]; paymentsConfigured: boolean }>(`/api/admin/billing?${qs}`).then((response) => {
      if (!response.ok) {
        console.error("[admin/billing] load failed:", type, response.error);
        setError(String(response.error || "error"));
      } else {
        setRows(response.data?.rows || []);
        setConfigured(Boolean(response.data?.paymentsConfigured));
        setError(null);
      }
      setLoading(false);
    });
  }, [type, status]);

  const title = { orders: b.ordersTitle, subscriptions: b.subscriptionsTitle, transactions: b.transactionsTitle, payments: b.paymentsTitle }[type];
  const statuses: readonly string[] =
    type === "transactions" ? CREDIT_TRANSACTION_TYPES : type === "subscriptions" ? SUBSCRIPTION_STATUSES : type === "payments" ? ["paid", "failed", "refunded"] : ORDER_STATUSES;
  const labelOf = (value: string) => (type === "transactions" ? b.types[value] : b.statuses[value]) || value.toUpperCase();

  return (
    <div>
      <PageHeader
        title={title}
        actions={type !== "transactions" && !configured ? <NotConfigured label={`Stripe · ${a.common.notConfigured}`} /> : undefined}
      />
      <div className="mb-4 flex flex-wrap gap-1.5">
        {["", ...statuses].map((value) => (
          <button
            key={value || "all"}
            type="button"
            onClick={() => setStatus(value)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
              status === value ? "border-[color:var(--neon-violet)] bg-violet-500/15 text-white" : "border-white/10 text-foreground/55 hover:text-white"
            }`}
          >
            {value ? labelOf(value) : a.common.all}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorState>{error}</ErrorState>
      ) : rows.length === 0 ? (
        <EmptyState>
          {a.common.empty}
          {type !== "transactions" && !configured && <p className="mt-2 text-xs text-amber-300/80">{a.dashboard.paymentsOff}</p>}
        </EmptyState>
      ) : (
        <div className="glass overflow-x-auto rounded-2xl">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-white/8 text-left text-[11px] uppercase tracking-wide text-foreground/40">
                <th className="px-4 py-3">{a.common.date}</th>
                <th className="px-3 py-3">{a.common.user}</th>
                {type === "transactions" ? (
                  <>
                    <th className="px-3 py-3">{b.type}</th>
                    <th className="px-3 py-3 text-right">{a.common.amount}</th>
                    <th className="px-3 py-3 text-right">{b.balanceAfter}</th>
                    <th className="px-4 py-3">{b.description}</th>
                  </>
                ) : type === "subscriptions" ? (
                  <>
                    <th className="px-3 py-3">{a.common.plan}</th>
                    <th className="px-3 py-3">{a.common.status}</th>
                    <th className="px-3 py-3">{b.start}</th>
                    <th className="px-3 py-3">{b.end}</th>
                    <th className="px-4 py-3">{b.provider}</th>
                  </>
                ) : (
                  <>
                    <th className="px-3 py-3">{b.number}</th>
                    <th className="px-3 py-3">{a.common.plan}</th>
                    <th className="px-3 py-3 text-right">{a.common.amount}</th>
                    <th className="px-3 py-3">{a.common.status}</th>
                    <th className="px-4 py-3">{b.provider}</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row._id} className="border-b border-white/5 last:border-0">
                  <td className="px-4 py-3 text-xs text-foreground/60">{fmtDate(row.paid_at || row.createdAt, true)}</td>
                  <td className="px-3 py-3 text-xs text-white">{row.user?.email || "—"}</td>
                  {type === "transactions" ? (
                    <>
                      <td className="px-3 py-3"><Pill tone={row.amount > 0 ? "green" : "amber"}>{labelOf(row.type || "")}</Pill></td>
                      <td className={`px-3 py-3 text-right font-bold ${row.amount > 0 ? "text-emerald-300" : "text-amber-300"}`}>
                        {row.amount > 0 ? `+${row.amount}` : row.amount}
                      </td>
                      <td className="px-3 py-3 text-right text-white">{row.balance_after ?? "N/A"}</td>
                      <td className="px-4 py-3 text-xs text-foreground/55">{row.description || "—"}</td>
                    </>
                  ) : type === "subscriptions" ? (
                    <>
                      <td className="px-3 py-3 text-xs text-white">{row.plan?.name || "—"}</td>
                      <td className="px-3 py-3"><StatusPill status={row.status} label={row.status ? labelOf(row.status) : undefined} /></td>
                      <td className="px-3 py-3 text-xs text-foreground/60">{fmtDate(row.start_date)}</td>
                      <td className="px-3 py-3 text-xs text-foreground/60">{fmtDate(row.end_date)}</td>
                      <td className="px-4 py-3 text-xs text-foreground/55">{row.provider || "—"}</td>
                    </>
                  ) : (
                    <>
                      <td className="px-3 py-3 font-mono text-[11px] text-foreground/70">{row.order_number || "—"}</td>
                      <td className="px-3 py-3 text-xs text-white">{row.plan?.name || "—"}</td>
                      <td className="px-3 py-3 text-right font-bold text-white">{fmtAmount(row.amount, row.currency)}</td>
                      <td className="px-3 py-3"><StatusPill status={row.status} label={row.status ? labelOf(row.status) : undefined} /></td>
                      <td className="px-4 py-3 text-xs text-foreground/55">{row.provider || "—"}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
