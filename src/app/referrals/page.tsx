"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import { useLang } from "@/lib/i18n/context";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Check,
  CheckCircle2,
  Copy,
  Gift,
  Loader2,
  Lock,
  Send,
  Share2,
  Users,
} from "lucide-react";

interface Material {
  _id: string;
  title: string;
  icon: string;
  description: string;
  contentType: "prompts" | "guide" | "instruction";
  required: number;
  unlocked: boolean;
}

interface ReferralPayload {
  code: string;
  botUsername: string;
  botConfigured: boolean;
  referralLink: string;
  connectLink: string;
  telegramConnected: boolean;
  referrals: number;
  unlocked: number;
  materials: Material[];
}

/**
 * Personal referral hub: the visitor's own bot link, their invite progress and
 * which materials that unlocks. Requires an account, because the referral code
 * belongs to the account.
 */
export default function ReferralsPage() {
  const { t } = useLang();
  const r = t.referralPage;
  const { data: session, isPending } = useSession();

  const [data, setData] = useState<ReferralPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isPending) return;
    if (!session?.user) {
      setLoading(false);
      return;
    }
    api.get<ReferralPayload>("/api/referral").then((response) => {
      setLoading(false);
      if (!response.ok || !response.data) {
        console.error("[referrals] failed to load:", response.error);
        toast.error(String(response.error || t.common.error));
        return;
      }
      setData(response.data);
      console.log("[referrals] loaded, invited:", response.data.referrals);
    });
  }, [session, isPending, t.common.error]);

  const copyLink = async () => {
    if (!data?.referralLink) return;
    try {
      await navigator.clipboard.writeText(data.referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
      toast.success(r.copied);
    } catch (err) {
      console.error("[referrals] clipboard failed:", err);
      toast.error(String(t.common.error));
    }
  };

  if (isPending || loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-foreground/40" />
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <div className="glass-strong rounded-3xl p-8 text-center">
          <Gift className="mx-auto mb-4 h-10 w-10 text-[color:var(--neon-cyan)]" />
          <h1 className="font-display text-xl font-bold text-white">{r.title}</h1>
          <p className="mt-2 text-sm text-foreground/55">{r.loginRequired}</p>
          <Link
            href="/login?redirect=/referrals"
            className="mt-6 inline-block rounded-xl bg-gradient-to-r from-[#4c6fff] to-[#a855f7] px-6 py-3 text-sm font-bold text-white"
          >
            {t.nav.login}
          </Link>
        </div>
      </div>
    );
  }

  const botReady = Boolean(data?.botConfigured && data?.referralLink);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <header className="mb-6">
        <span className="glass inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-foreground/60">
          <Send className="h-3.5 w-3.5 text-[#229ED9]" />
          Telegram
        </span>
        <h1 className="font-display mt-3 text-2xl font-extrabold text-white sm:text-4xl">{r.title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-foreground/60 sm:text-base">{r.subtitle}</p>
      </header>

      {!botReady ? (
        <div className="glass-strong rounded-3xl px-6 py-14 text-center">
          <Send className="mx-auto mb-4 h-10 w-10 text-foreground/30" />
          <p className="font-display text-lg font-bold text-white">{r.botOffline}</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-foreground/50">{r.botOfflineSub}</p>
          <Link
            href="/catalog"
            className="mt-6 inline-block rounded-xl bg-gradient-to-r from-[#4c6fff] to-[#a855f7] px-6 py-3 text-sm font-bold text-white"
          >
            {t.nav.catalog}
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          {/* --------------------------- link card --------------------------- */}
          <section className="glass-strong animate-fade-up relative overflow-hidden rounded-3xl p-5 sm:p-6">
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#229ED9]/25 blur-3xl" />
            <div className="relative">
              <h2 className="font-display text-base font-bold text-white">{r.yourLink}</h2>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded-xl bg-white/6 px-4 py-3 font-mono text-xs text-[color:var(--neon-cyan)] sm:text-sm">
                  {data!.referralLink}
                </code>
                <Button
                  type="button"
                  onClick={copyLink}
                  className="rounded-xl bg-gradient-to-r from-[#4c6fff] to-[#a855f7] text-white"
                >
                  {copied ? <Check className="mr-1.5 h-4 w-4" /> : <Copy className="mr-1.5 h-4 w-4" />}
                  {r.copy}
                </Button>
              </div>
              <p className="mt-2 text-xs text-foreground/40">{r.linkHint}</p>

              <div className="mt-4 flex flex-wrap gap-2">
                <a
                  href={data!.referralLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-xl bg-[#229ED9] px-4 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
                >
                  <Send className="h-4 w-4" />
                  {r.openBot}
                </a>
                <a
                  href={`https://t.me/share/url?url=${encodeURIComponent(
                    data!.referralLink
                  )}&text=${encodeURIComponent(r.subtitle)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="glass glass-hover flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold text-foreground/75"
                >
                  <Share2 className="h-4 w-4" />
                  {r.share}
                </a>
                {data!.telegramConnected ? (
                  <span className="flex items-center gap-1.5 rounded-xl bg-emerald-400/12 px-4 py-2.5 text-sm font-bold text-emerald-300">
                    <CheckCircle2 className="h-4 w-4" />
                    {r.connected}
                  </span>
                ) : (
                  <a
                    href={data!.connectLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={r.connectHint}
                    className="glass glass-hover flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold text-foreground/75"
                  >
                    <Send className="h-4 w-4" />
                    {r.connectTelegram}
                  </a>
                )}
              </div>
            </div>
          </section>

          {/* ----------------------------- stats ----------------------------- */}
          <section className="grid gap-3 sm:grid-cols-2">
            <div className="glass animate-fade-up rounded-2xl p-5">
              <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#229ED9] to-[#4c6fff]">
                <Users className="h-4.5 w-4.5 text-white" />
              </span>
              <p className="font-display text-3xl font-extrabold text-white">{data!.referrals}</p>
              <p className="mt-0.5 text-sm text-foreground/50">{r.invited}</p>
            </div>
            <div className="glass animate-fade-up rounded-2xl p-5" style={{ animationDelay: "60ms" }}>
              <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#22c55e] to-[#14b8a6]">
                <Gift className="h-4.5 w-4.5 text-white" />
              </span>
              <p className="font-display text-3xl font-extrabold text-white">
                {data!.unlocked}
                <span className="text-lg text-foreground/35"> / {data!.materials.length}</span>
              </p>
              <p className="mt-0.5 text-sm text-foreground/50">{r.unlockedCount}</p>
            </div>
          </section>

          {/* --------------------------- materials --------------------------- */}
          <section>
            <h2 className="font-display mb-3 text-lg font-extrabold text-white">{r.materials}</h2>
            {data!.materials.length === 0 ? (
              <div className="glass rounded-2xl px-6 py-12 text-center">
                <p className="font-display text-base font-bold text-white">{r.empty}</p>
                <p className="mt-1 text-sm text-foreground/45">{r.emptySub}</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {data!.materials.map((material, index) => (
                  <div
                    key={material._id}
                    className={`glass animate-fade-up rounded-2xl p-4 ${material.unlocked ? "" : "opacity-70"}`}
                    style={{ animationDelay: `${Math.min(index, 9) * 40}ms` }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/8 text-lg">
                        {material.unlocked ? material.icon : <Lock className="h-4 w-4 text-foreground/40" />}
                      </span>
                      <span
                        className={`rounded-lg px-2 py-1 text-[10px] font-bold ${
                          material.unlocked
                            ? "bg-emerald-400/15 text-emerald-300"
                            : "bg-amber-400/15 text-amber-300"
                        }`}
                      >
                        {material.unlocked ? r.unlocked : `${material.required} 👥`}
                      </span>
                    </div>
                    <p className="font-display mt-3 text-sm font-bold text-white">{material.title}</p>
                    {material.description && (
                      <p className="mt-1.5 line-clamp-3 text-xs text-foreground/50">{material.description}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ------------------------------ how ------------------------------ */}
          <section className="glass rounded-2xl p-5">
            <h2 className="font-display mb-4 text-base font-bold text-white">{r.howTitle}</h2>
            <ol className="space-y-3">
              {[r.step1, r.step2, r.step3].map((step, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span className="font-display flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#4c6fff] to-[#a855f7] text-xs font-extrabold text-white">
                    {index + 1}
                  </span>
                  <span className="text-sm text-foreground/65">{step}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>
      )}
    </div>
  );
}
