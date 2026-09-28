"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Coins, Crown, Loader2, Receipt } from "lucide-react";
import { api } from "@/lib/api";
import { useLang } from "@/lib/i18n/context";
import { publicDict } from "@/lib/i18n/public-dict";
import { CURRENCY_SYMBOLS } from "@/lib/money";

interface BillingData {
  plan: { name: string; slug: string } | null;
  subscription: { status?: string; start_date?: string; end_date?: string; plan_name: string | null } | null;
  credits: number;
  orders: { _id: string; order_number?: string; amount?: number; currency?: string; status?: string; description?: string; createdAt?: string; paid_at?: string }[];
  transactions: { _id: string; amount?: number; type?: string; balance_after?: number; description?: string; createdAt?: string }[];
  paymentsConfigured: boolean;
}

const STATUS_TONE: Record<string, string> = {
  active: "text-emerald-300 bg-emerald-400/10 border-emerald-400/30",
  paid: "text-emerald-300 bg-emerald-400/10 border-emerald-400/30",
  pending: "text-amber-300 bg-amber-400/10 border-amber-400/30",
  failed: "text-rose-300 bg-rose-400/10 border-rose-400/30",
  refunded: "text-violet-300 bg-violet-400/10 border-violet-400/30",
};

const Badge = ({ status }: { status?: string }) => (
  <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${STATUS_TONE[status || ""] || "border-white/12 bg-white/5 text-foreground/55"}`}>
    {status ? status.toUpperCase() : "N/A"}
  </span>
);

/** Profile → plan, status, end date, credits, payment history and manage link. All from the DB. */
export function ProfileBilling() {
  const { lang } = useLang();
  const b = publicDict(lang).billing;
  const [data, setData] = useState<BillingData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    api.get<BillingData>("/api/me/billing").then((response) => {
      if (!response.ok) {
        console.error("[profile] billing load failed:", response.error);
        setError(true);
        return;
      }
      setData(response.data || null);
    });
  }, []);

  if (error) return null;
  if (!data) {
    return (
      <section id="billing" className="glass flex justify-center rounded-3xl p-6">
        <Loader2 className="h-5 w-5 animate-spin text-foreground/40" />
      </section>
    );
  }

  const money = (amount?: number, currency?: string) =>
    typeof amount === "number" ? `${CURRENCY_SYMBOLS[(currency || "usd") as keyof typeof CURRENCY_SYMBOLS] || ""}${amount.toFixed(2)}` : "N/A";
  const date = (value?: string) => (value ? new Date(value).toLocaleDateString() : "N/A");

  return (
    <section id="billing" className="glass-strong animate-fade-up relative overflow-hidden rounded-3xl p-6">
      <div className="pointer-events-none absolute -right-14 -top-14 h-44 w-44 rounded-full bg-[color:var(--neon-violet)]/20 blur-3xl" aria-hidden />
      <div className="relative">
        <h2 className="font-display flex items-center gap-2 text-lg font-bold text-white">
          <Crown className="h-5 w-5 text-amber-300" />
          {b.title}
        </h2>

        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <div className="rounded-2xl bg-white/5 px-4 py-3">
            <p className="text-[11px] text-foreground/45">{b.plan}</p>
            <p className="mt-1 font-display font-bold text-white">{data.plan?.name || b.free}</p>
          </div>
          <div className="rounded-2xl bg-white/5 px-4 py-3">
            <p className="text-[11px] text-foreground/45">{b.status}</p>
            <p className="mt-1.5"><Badge status={data.subscription?.status} /></p>
          </div>
          <div className="rounded-2xl bg-white/5 px-4 py-3">
            <p className="text-[11px] text-foreground/45">{b.endDate}</p>
            <p className="mt-1 font-display font-bold text-white">{date(data.subscription?.end_date)}</p>
          </div>
          <div className="rounded-2xl bg-white/5 px-4 py-3">
            <p className="flex items-center gap-1 text-[11px] text-foreground/45"><Coins className="h-3 w-3" />{b.credits}</p>
            <p className="mt-1 font-display font-bold text-white">{data.credits}</p>
          </div>
        </div>

        <Link
          href="/pro"
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#4c6fff] to-[#a855f7] px-4 py-2.5 text-sm font-bold text-white"
        >
          <Crown className="h-4 w-4" />
          {data.plan ? b.manage : b.upgrade}
        </Link>

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <div>
            <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-foreground/45">
              <Receipt className="h-3.5 w-3.5" />
              {b.history}
            </h3>
            {data.orders.length === 0 ? (
              <p className="rounded-xl bg-white/4 px-3 py-4 text-center text-xs text-foreground/40">{b.noPayments}</p>
            ) : (
              <ul className="space-y-1.5">
                {data.orders.map((order) => (
                  <li key={order._id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-white/4 px-3 py-2 text-sm">
                    <span className="font-semibold text-white">{money(order.amount, order.currency)}</span>
                    <Badge status={order.status} />
                    <span className="min-w-0 flex-1 truncate text-xs text-foreground/50">{order.description || order.order_number}</span>
                    <span className="text-xs text-foreground/35">{date(order.paid_at || order.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-foreground/45">
              <Coins className="h-3.5 w-3.5" />
              {b.creditHistory}
            </h3>
            {data.transactions.length === 0 ? (
              <p className="rounded-xl bg-white/4 px-3 py-4 text-center text-xs text-foreground/40">{b.noCredits}</p>
            ) : (
              <ul className="space-y-1.5">
                {data.transactions.map((tx) => (
                  <li key={tx._id} className="flex items-center gap-3 rounded-xl bg-white/4 px-3 py-2 text-sm">
                    <span className={`font-bold ${(tx.amount || 0) > 0 ? "text-emerald-300" : "text-amber-300"}`}>
                      {(tx.amount || 0) > 0 ? `+${tx.amount}` : tx.amount}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-xs text-foreground/55">{tx.description || tx.type}</span>
                    <span className="text-xs text-foreground/35">{date(tx.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
