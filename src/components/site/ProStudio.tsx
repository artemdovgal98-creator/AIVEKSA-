"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Coins, Copy, Loader2, Wand2 } from "lucide-react";
import { api } from "@/lib/api";
import { useLang } from "@/lib/i18n/context";
import { publicDict } from "@/lib/i18n/public-dict";

type Format = { id: string; cost: number };
const TONES = ["friendly", "professional", "bold", "funny", "inspiring"] as const;

/** Minimal markdown view: headings, bullets and paragraphs, without injecting HTML. */
function ResultView({ text }: { text: string }) {
  return (
    <div className="space-y-2 text-sm leading-relaxed text-foreground/85">
      {text.split("\n").map((line, index) => {
        const heading = line.match(/^#{1,4}\s+(.*)$/);
        if (heading) return <p key={index} className="font-display pt-3 text-base font-bold text-white">{heading[1].replace(/\*\*/g, "")}</p>;
        if (!line.trim()) return null;
        const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
        const clean = (bullet ? bullet[1] : line).replace(/\*\*/g, "");
        return bullet ? (
          <p key={index} className="flex gap-2 pl-1"><span className="text-[#a855f7]">•</span><span className="break-anywhere">{clean}</span></p>
        ) : (
          <p key={index} className="break-anywhere whitespace-pre-wrap">{clean}</p>
        );
      })}
    </div>
  );
}

export function ProStudio({ initialBalance, formats }: { initialBalance: number; formats: Format[] }) {
  const { lang } = useLang();
  const s = publicDict(lang).studio;
  const [format, setFormat] = useState(formats[0]?.id || "article");
  const [tone, setTone] = useState<(typeof TONES)[number]>("friendly");
  const [topic, setTopic] = useState("");
  const [details, setDetails] = useState("");
  const [balance, setBalance] = useState(initialBalance);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const cost = formats.find((entry) => entry.id === format)?.cost || 0;
  const notEnough = balance < cost;

  async function generate() {
    if (topic.trim().length < 3 || loading) return;
    setLoading(true);
    setError("");
    console.log("[pro-studio] generate", format, tone);
    const res = (await api.post<{ text: string; balance: number }>("/api/pro/generate", { format, tone, topic, details, lang })) as {
      ok: boolean; data?: any; error?: any; code?: string;
    };
    setLoading(false);
    if (res.ok && res.data) {
      setResult(res.data.text);
      setBalance(res.data.balance);
      return;
    }
    console.error("[pro-studio] generation failed:", res.error);
    if (res.code === "NO_CREDITS") {
      if (typeof res.data?.balance === "number") setBalance(res.data.balance);
      setError(s.noCredits);
    } else setError(s.error);
  }

  async function copy() {
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const chip = (active: boolean) =>
    `rounded-xl px-3 py-2 text-left text-xs font-medium transition ${
      active ? "bg-gradient-to-r from-[#4c6fff] to-[#a855f7] text-white glow-primary" : "glass text-foreground/70 hover:text-white"
    }`;

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
      <section className="glass-strong neon-border min-w-0 space-y-5 rounded-3xl p-5 sm:p-6">
        <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
          <span className="text-xs text-foreground/60">{s.balance}</span>
          <span className="flex items-center gap-1.5 font-display text-lg font-bold text-white">
            <Coins className="h-4 w-4 text-amber-300" />
            {balance} <span className="text-xs font-normal text-foreground/55">{s.credits}</span>
          </span>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground/50">{s.format}</p>
          <div className="grid grid-cols-2 gap-2">
            {formats.map((entry) => (
              <button key={entry.id} type="button" onClick={() => setFormat(entry.id)} className={chip(format === entry.id)}>
                <span className="block">{s.formats[entry.id as keyof typeof s.formats] || entry.id}</span>
                <span className="mt-0.5 block text-[10px] opacity-70">{entry.cost} {s.credits}</span>
              </button>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-foreground/50">{s.topic}</span>
          <input value={topic} onChange={(e) => setTopic(e.target.value)} maxLength={500} placeholder={s.topicPlaceholder}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-foreground/35 focus:border-[#a855f7]/60" />
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-foreground/50">{s.details}</span>
          <textarea value={details} onChange={(e) => setDetails(e.target.value)} maxLength={1500} rows={3} placeholder={s.detailsPlaceholder}
            className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-foreground/35 focus:border-[#a855f7]/60" />
        </label>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground/50">{s.tone}</p>
          <div className="flex flex-wrap gap-2">
            {TONES.map((entry) => (
              <button key={entry} type="button" onClick={() => setTone(entry)} className={chip(tone === entry)}>{s.tones[entry]}</button>
            ))}
          </div>
        </div>

        <button type="button" onClick={generate} disabled={loading || topic.trim().length < 3 || notEnough}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#4c6fff] to-[#a855f7] px-5 py-3 text-sm font-semibold text-white glow-primary transition disabled:cursor-not-allowed disabled:opacity-50">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
          {loading ? s.generating : `${s.generate} · ${cost} ${s.credits}`}
        </button>
        {notEnough && (
          <p className="text-center text-xs text-amber-300">
            {s.noCredits} <Link href="/profile#billing" className="underline">{s.balance}</Link>
          </p>
        )}
        {error && <p className="text-center text-xs text-rose-300">{error}</p>}
      </section>

      <section className="glass min-w-0 rounded-3xl p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="font-display text-lg font-bold text-white">{s.result}</p>
          {result && (
            <button type="button" onClick={copy} className="glass flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-foreground/80 hover:text-white">
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? s.copied : s.copy}
            </button>
          )}
        </div>
        {loading ? (
          <div className="space-y-3">
            {[90, 75, 85, 60, 80].map((w, i) => <div key={i} className="h-3 animate-pulse rounded bg-white/10" style={{ width: `${w}%` }} />)}
          </div>
        ) : result ? (
          <ResultView text={result} />
        ) : (
          <p className="py-16 text-center text-sm text-foreground/45">{s.empty}</p>
        )}
      </section>
    </div>
  );
}
