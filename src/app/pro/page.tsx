import type { Metadata } from "next";
import Link from "next/link";
import { Check, Crown, Sparkles } from "lucide-react";
import { getServerDict } from "@/lib/i18n/server";
import { publicDict } from "@/lib/i18n/public-dict";
import { getActivePlans, getActiveSubscription, planOf } from "@/lib/access";
import { getSessionUser } from "@/lib/admin-auth";
import { isPaymentsConfigured } from "@/lib/billing";
import { ProCheckoutButton } from "@/components/site/ProCheckoutButton";
import { CURRENCY_SYMBOLS } from "@/lib/money";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AIVEXA PRO",
  description: "AIVEXA PRO — Social Studio, AI Content Generator, advanced AI Radar analytics, no ads and priority AI credits. The AI catalog stays free.",
  alternates: { canonical: "/pro" },
};

export default async function ProPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { lang } = await getServerDict();
  const p = publicDict(lang).pro;
  const params = await searchParams;
  const [plans, sessionUser] = await Promise.all([
    getActivePlans().catch((err) => {
      console.error("[pro] plans load failed:", err);
      return [];
    }),
    getSessionUser(),
  ]);
  const plan = plans.find((entry) => entry.slug === "pro") || plans[0] || null;
  const subscription = sessionUser?.id ? await getActiveSubscription(sessionUser.id).catch(() => null) : null;
  const activePlan = planOf(subscription);
  const activeUntil = subscription && activePlan && activePlan._id === plan?._id ? subscription.end_date || null : null;
  const features = String(plan?.features || "").split("\n").map((line) => line.trim()).filter(Boolean);
  const symbol = CURRENCY_SYMBOLS[(plan?.currency || "usd") as keyof typeof CURRENCY_SYMBOLS] || "$";

  return (
    <div className="relative mx-auto max-w-5xl px-4 pb-20 pt-10 sm:px-6 sm:pt-16 lg:px-8">
      <div className="animate-float pointer-events-none absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-[#a855f7]/20 blur-[110px]" aria-hidden />

      <header className="relative text-center">
        <div className="glass mx-auto mb-5 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium text-foreground/75">
          <Crown className="h-3.5 w-3.5 text-amber-300" />
          {p.title}
        </div>
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-white sm:text-6xl">
          AIVEXA <span className="neon-text">PRO</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-foreground/65 sm:text-base">{p.subtitle}</p>
        {params.cancelled && <p className="mt-4 text-sm text-amber-300">{p.cancelled}</p>}
      </header>

      <div className="relative mt-10 grid gap-5 md:grid-cols-2">
        <section className="glass rounded-3xl p-6 sm:p-8">
          <p className="font-display text-lg font-bold text-white">{p.freeTitle}</p>
          <p className="font-display mt-3 text-4xl font-extrabold text-white">{symbol}0</p>
          <ul className="mt-6 space-y-3 text-sm text-foreground/75">
            {p.freeFeatures.map((line) => (
              <li key={line} className="flex items-start gap-2.5">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                {line}
              </li>
            ))}
          </ul>
        </section>

        <section className="glass-strong neon-border glow-primary relative overflow-hidden rounded-3xl p-6 sm:p-8">
          <div className="pointer-events-none absolute -right-14 -top-14 h-48 w-48 rounded-full bg-[color:var(--neon-violet)]/25 blur-3xl" aria-hidden />
          {plan ? (
            <div className="relative">
              <p className="flex items-center gap-2 font-display text-lg font-bold text-white">
                <Sparkles className="h-4.5 w-4.5 text-[color:var(--neon-cyan)]" />
                {plan.name}
              </p>
              <p className="font-display mt-3 text-4xl font-extrabold text-white">
                {symbol}
                {Number(plan.price || 0).toFixed(2)}
                <span className="ml-1.5 text-base font-semibold text-foreground/50">
                  / {plan.duration_days || 30} {p.per}
                </span>
              </p>
              {plan.description && <p className="mt-2 text-sm text-foreground/60">{plan.description}</p>}
              <ul className="mt-6 space-y-3 text-sm text-foreground/85">
                {features.map((line) => (
                  <li key={line} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--neon-cyan)]" />
                    {line}
                  </li>
                ))}
                {Number(plan.ai_credits) > 0 && (
                  <li className="flex items-start gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--neon-cyan)]" />
                    {plan.ai_credits} {p.credits}
                  </li>
                )}
              </ul>
              <div className="mt-8">
                <ProCheckoutButton
                  planSlug={plan.slug}
                  signedIn={Boolean(sessionUser?.id)}
                  paymentsConfigured={isPaymentsConfigured()}
                  activeUntil={activeUntil}
                />
              </div>
            </div>
          ) : (
            <p className="relative py-10 text-center text-sm text-foreground/50">{p.noPlan}</p>
          )}
        </section>
      </div>

      <div className="relative mt-8 text-center">
        <Link href="/pro/studio" className="glass glass-hover inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white">
          <Sparkles className="h-4 w-4 text-[#a855f7]" />
          {publicDict(lang).studio.open}
        </Link>
      </div>
    </div>
  );
}
