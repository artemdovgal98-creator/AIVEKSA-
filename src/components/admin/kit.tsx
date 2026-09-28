"use client";

import { Loader2 } from "lucide-react";
import { CURRENCY_SYMBOLS } from "@/lib/money";

/** Small building blocks shared by the Stage 1 admin sections. */

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 className="font-display text-lg font-extrabold text-white sm:text-xl">{title}</h2>
        {subtitle && <p className="mt-1 max-w-3xl text-xs leading-relaxed text-foreground/50">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon: Icon,
  accent = "text-[#8ab4ff]",
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  accent?: string;
}) {
  return (
    <div className="glass animate-fade-up rounded-2xl px-4 py-4">
      {Icon && <Icon className={`mb-2 h-4.5 w-4.5 ${accent}`} />}
      <p className="font-display text-xl font-extrabold text-white sm:text-2xl">{value}</p>
      <p className="mt-0.5 text-[11px] leading-tight text-foreground/45">{label}</p>
    </div>
  );
}

const PILL_TONES: Record<string, string> = {
  green: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  cyan: "border-cyan-400/30 bg-cyan-400/10 text-cyan-300",
  amber: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  red: "border-rose-400/30 bg-rose-400/10 text-rose-300",
  violet: "border-violet-400/30 bg-violet-400/10 text-violet-300",
  gray: "border-white/12 bg-white/5 text-foreground/55",
};

const STATUS_TONE: Record<string, keyof typeof PILL_TONES> = {
  active: "green",
  paid: "green",
  tracking_ok: "green",
  approved: "green",
  tracking_unknown: "cyan",
  pending: "amber",
  needs_review: "amber",
  broken: "red",
  failed: "red",
  refunded: "violet",
  cancelled: "gray",
  expired: "gray",
  inactive: "gray",
};

export function Pill({ children, tone = "gray" }: { children: React.ReactNode; tone?: keyof typeof PILL_TONES }) {
  return (
    <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${PILL_TONES[tone]}`}>
      {children}
    </span>
  );
}

export function StatusPill({ status, label }: { status?: string | null; label?: string }) {
  if (!status) return <Pill>N/A</Pill>;
  return <Pill tone={STATUS_TONE[status] || "gray"}>{label || status.toUpperCase()}</Pill>;
}

export function NotConfigured({ label = "NOT CONFIGURED" }: { label?: string }) {
  return <Pill tone="amber">{label}</Pill>;
}

export function LoadingBlock() {
  return (
    <div className="flex min-h-[30vh] items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-foreground/40" />
    </div>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="glass rounded-2xl px-6 py-12 text-center text-sm text-foreground/45">{children}</div>;
}

export function ErrorState({ children }: { children: React.ReactNode }) {
  return <div className="glass rounded-2xl px-6 py-12 text-center text-sm text-rose-300">{children}</div>;
}

export interface SegmentedProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; count?: number }[];
}

export function Segmented<T extends string>({ value, onChange, options }: SegmentedProps<T>) {
  return (
    <div className="glass inline-flex flex-wrap gap-1 rounded-xl p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
            value === option.value
              ? "bg-gradient-to-r from-[#4c6fff] to-[#a855f7] text-white"
              : "text-foreground/60 hover:text-white"
          }`}
        >
          {option.label}
          {typeof option.count === "number" && <span className="ml-1.5 opacity-70">{option.count}</span>}
        </button>
      ))}
    </div>
  );
}

export const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-foreground/30 outline-none transition focus:border-[color:var(--neon-violet)] focus:bg-white/8";

export const primaryButton =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#4c6fff] to-[#a855f7] px-4 py-2.5 text-sm font-bold text-white shadow-[0_0_18px_rgba(124,92,255,0.35)] transition hover:brightness-110 disabled:opacity-50";

export const ghostButton =
  "glass glass-hover inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-foreground/80 disabled:opacity-50";

export const dangerButton =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-rose-400/35 bg-rose-500/10 px-4 py-2.5 text-sm font-bold text-rose-300 transition hover:bg-rose-500/20 disabled:opacity-50";

export function fmtDate(value?: string | null, withTime = false): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return withTime ? date.toLocaleString() : date.toLocaleDateString();
}

export function fmtAmount(amount?: number | null, currency?: string | null): string {
  if (amount === null || amount === undefined || !Number.isFinite(Number(amount))) return "N/A";
  const symbol = CURRENCY_SYMBOLS[(currency || "usd") as keyof typeof CURRENCY_SYMBOLS] || "";
  return `${symbol}${Number(amount).toFixed(2)}`;
}

export function fmtPercent(value?: number | null, digits = 2): string {
  return value === null || value === undefined || !Number.isFinite(value) ? "N/A" : `${value.toFixed(digits)}%`;
}

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-foreground/45">{label}</span>
      {children}
      {error ? (
        <span className="mt-1 block text-xs text-rose-300">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-[11px] text-foreground/35">{hint}</span>
      ) : null}
    </label>
  );
}
