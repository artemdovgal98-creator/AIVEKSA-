"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowDownCircle, ArrowUpCircle, Coins, Users } from "lucide-react";
import { api } from "@/lib/api";
import { useAdminDict } from "@/lib/i18n/admin-dict";
import { BillingTable } from "@/components/admin/BillingTable";
import { CreditPacksEditor } from "@/components/admin/CreditPacksEditor";
import { PageHeader, StatCard } from "@/components/admin/kit";

interface Tx {
  amount: number;
}

/** AIVEXA CREDITS overview — totals are summed from the real ledger. */
export default function AdminCreditsPage() {
  const a = useAdminDict();
  const d = a.credits;
  const [totals, setTotals] = useState<{ issued: number; spent: number; users: number } | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<{ rows: Tx[] }>("/api/admin/billing?type=transactions"),
      api.get<{ credits: number }[]>("/api/admin/users"),
    ]).then(([tx, users]) => {
      if (!tx.ok || !users.ok) {
        console.error("[admin/credits] load failed:", tx.error || users.error);
        return;
      }
      const rows = tx.data?.rows || [];
      setTotals({
        issued: rows.filter((r) => r.amount > 0).reduce((sum, r) => sum + r.amount, 0),
        spent: rows.filter((r) => r.amount < 0).reduce((sum, r) => sum - r.amount, 0),
        users: (users.data || []).filter((u) => u.credits > 0).length,
      });
    });
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader title={d.title} subtitle={d.subtitle} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label={d.issued} value={totals ? totals.issued : "…"} icon={ArrowUpCircle} accent="text-emerald-300" />
        <StatCard label={d.spent} value={totals ? totals.spent : "…"} icon={ArrowDownCircle} accent="text-amber-300" />
        <StatCard label={d.accounts} value={totals ? totals.users : "…"} icon={Users} accent="text-violet-300" />
      </div>
      <p className="glass flex items-center gap-2 rounded-2xl px-4 py-3 text-xs text-foreground/60">
        <Coins className="h-4 w-4 text-amber-300" />
        {d.howTo}{" "}
        <Link href="/admin/users" className="font-semibold text-[color:var(--neon-cyan)] hover:underline">
          {a.menu.users} →
        </Link>
      </p>
      <CreditPacksEditor />
      <BillingTable type="transactions" />
    </div>
  );
}
