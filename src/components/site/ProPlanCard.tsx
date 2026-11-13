"use client";

import { useState } from "react";
import { Check, Sparkles } from "lucide-react";
import { ProCheckoutButton } from "@/components/site/ProCheckoutButton";
import { useLang } from "@/lib/i18n/context";
import { publicDict } from "@/lib/i18n/public-dict";

export interface ProPlanCardProps {
  planSlug: string;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number | null;
  symbol: string;
  features: string[];
  aiCredits: number;
  signedIn: boolean;
  paymentsConfigured: boolean;
  activeUntil: string | null;
}

/** AIVEXA PRO price card — lets the buyer pick Month / Year when a yearly price is configured. */
export function ProPlanCard({
  planSlug,
  name,
  description,
  monthlyPrice,
  yearlyPrice,
  symbol,
  features,
  aiCredits,
  signedIn,
  paymentsConfigured,
  activeUntil,
}: ProPlanCardProps) {
  const { lang } = useLang();
  const p = publicDict(lang).pro;
  const [period, setPeriod] = useState<"month" | "year">("month");
  const hasYearly = yearlyPrice !== null && yearlyPrice > 0;
  const price = period === "year" && hasYearly ? (yearlyPrice as number) : monthlyPrice;
  const savePct = hasYearly ? Math.max(Math.round((1 - (yearlyPrice as number) / (monthlyPrice * 12)) * 100), 0) : 0;

  return (
    <div>
      <p className="flex items-center gap-2 font-display text-lg font-bold text-white">
        <Sparkles className="h-4.5 w-4.5 text-[color:var(--neon-cyan)]" />
        {name}
      </p>

      {hasYearly && (
        <div className="mt-4 inline-flex rounded-xl bg-white/5 p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setPeriod("month")}
            className={`rounded-lg px-3 py-1.5 transition ${period === "month" ? "bg-white/15 text-white" : "text-foreground/55"}`}
          >
            {p.perMonth}
          </button>
          <button
            type="button"
            onClick={() => setPeriod("year")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${period === "year" ? "bg-white/15 text-white" : "text-foreground/55"}`}
          >
            {p.perYear}
            {savePct > 0 && <span className="rounded-full bg-emerald-400/20 px-1.5 py-0.5 text-[10px] text-emerald-300">-{savePct}%</span>}
          </button>
        </div>
      )}

      <p className="font-display mt-3 text-4xl font-extrabold text-white">
        {symbol}
        {price.toFixed(2)}
        <span className="ml-1.5 text-base font-semibold text-foreground/50">/ {period === "year" ? p.perYear.toLowerCase() : p.perMonth.toLowerCase()}</span>
      </p>
      {description && <p className="mt-2 text-sm text-foreground/60">{description}</p>}
      <ul className="mt-6 space-y-3 text-sm text-foreground/85">
        {features.map((line) => (
          <li key={line} className="flex items-start gap-2.5">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--neon-cyan)]" />
            {line}
          </li>
        ))}
        {aiCredits > 0 && (
          <li className="flex items-start gap-2.5">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--neon-cyan)]" />
            {aiCredits} {p.credits}
          </li>
        )}
      </ul>
      <div className="mt-8">
        <ProCheckoutButton planSlug={planSlug} signedIn={signedIn} paymentsConfigured={paymentsConfigured} activeUntil={activeUntil} period={period} />
      </div>
    </div>
  );
}
