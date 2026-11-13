"use client";

import { useState } from "react";
import { formatMoney, type Money } from "@/lib/money";

export interface DailyRow {
  date: string;
  clicks: number;
  unique: number;
  revenue: Money;
}

const CLICKS_COLOR = "#3987e5";
const UNIQUE_COLOR = "#c98500";

function fmtShortDate(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}.${m}`;
}

/** 30-day clicks/unique chart + table, today first, with a period filter. Doubles as its own accessible table view. */
export function DailyChart({
  data,
  labels,
}: {
  data: DailyRow[];
  labels: {
    period: string; days7: string; days14: string; days30: string;
    colDate: string; colClicks: string; colUnique: string; colRevenue: string;
    transitions: string; unique: string;
  };
}) {
  const [period, setPeriod] = useState<7 | 14 | 30>(30);
  const rows = data.slice(0, period); // today-first, for the table
  const chronological = [...rows].reverse(); // oldest → newest, for the chart

  const maxClicks = Math.max(1, ...chronological.map((r) => r.clicks));
  const width = 760;
  const height = 180;
  const padding = { top: 10, right: 8, bottom: 20, left: 8 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;
  const n = Math.max(chronological.length, 1);
  const barW = Math.max(2, plotW / n - 3);

  const xOf = (i: number) => padding.left + (i + 0.5) * (plotW / n);
  const yOfClicks = (v: number) => padding.top + plotH - (v / maxClicks) * plotH;

  const linePoints = chronological.map((r, i) => `${xOf(i)},${yOfClicks(r.unique)}`).join(" ");

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3 text-[11px] text-foreground/55">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: CLICKS_COLOR }} aria-hidden />
            {labels.transitions}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: UNIQUE_COLOR }} aria-hidden />
            {labels.unique}
          </span>
        </div>
        <div className="glass inline-flex gap-1 rounded-lg p-1 text-xs">
          {([7, 14, 30] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`rounded-md px-2.5 py-1 font-semibold transition ${period === p ? "bg-gradient-to-r from-[#4c6fff] to-[#a855f7] text-white" : "text-foreground/55 hover:text-white"}`}
            >
              {p === 7 ? labels.days7 : p === 14 ? labels.days14 : labels.days30}
            </button>
          ))}
        </div>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label={labels.transitions}>
        {chronological.map((r, i) => (
          <rect
            key={r.date}
            x={xOf(i) - barW / 2}
            y={yOfClicks(r.clicks)}
            width={barW}
            height={Math.max(0, padding.top + plotH - yOfClicks(r.clicks))}
            rx={2}
            fill={CLICKS_COLOR}
            opacity={0.85}
          >
            <title>
              {r.date}: {labels.transitions} {r.clicks}, {labels.unique} {r.unique}
            </title>
          </rect>
        ))}
        <polyline points={linePoints} fill="none" stroke={UNIQUE_COLOR} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {chronological.map((r, i) => (
          <circle key={`${r.date}-dot`} cx={xOf(i)} cy={yOfClicks(r.unique)} r={2.5} fill={UNIQUE_COLOR}>
            <title>
              {r.date}: {labels.unique} {r.unique}
            </title>
          </circle>
        ))}
      </svg>

      <div className="mt-3 max-h-64 overflow-y-auto rounded-xl border border-white/6">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-[#101326]">
            <tr className="text-left text-[10px] uppercase tracking-wide text-foreground/40">
              <th className="px-3 py-2">{labels.colDate}</th>
              <th className="px-3 py-2 text-right">{labels.colClicks}</th>
              <th className="px-3 py-2 text-right">{labels.colUnique}</th>
              <th className="px-3 py-2 text-right">{labels.colRevenue}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.date} className="border-t border-white/5">
                <td className="px-3 py-1.5 text-foreground/70">{fmtShortDate(r.date)}</td>
                <td className="px-3 py-1.5 text-right font-semibold text-white">{r.clicks}</td>
                <td className="px-3 py-1.5 text-right text-foreground/70">{r.unique}</td>
                <td className="px-3 py-1.5 text-right text-emerald-300">{formatMoney(r.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
