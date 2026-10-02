import type { Metadata } from "next";
import Link from "next/link";
import { Lock, Sparkles } from "lucide-react";
import { getServerDict } from "@/lib/i18n/server";
import { publicDict } from "@/lib/i18n/public-dict";
import { getCurrentDbUser } from "@/lib/admin-auth";
import { hasAccess } from "@/lib/access";
import { getBalance } from "@/lib/credits";
import { STUDIO_FORMATS } from "@/lib/pro-studio";
import { ProStudio } from "@/components/site/ProStudio";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AI Studio · AIVEXA PRO",
  description: "AIVEXA PRO AI Studio — generate articles, social campaigns, video scripts, emails, ad copy and content plans with AI.",
  alternates: { canonical: "/pro/studio" },
};

export default async function ProStudioPage() {
  const { lang } = await getServerDict();
  const s = publicDict(lang).studio;
  const user = await getCurrentDbUser();
  const allowed = user ? (await hasAccess(user, "pro")) || (await hasAccess(user, "content_generator")) : false;
  const balance = user && allowed ? await getBalance(user._id) : 0;
  const formats = Object.entries(STUDIO_FORMATS).map(([id, format]) => ({ id, cost: format.cost }));
  console.log(`[pro/studio] user=${user?._id || "guest"} allowed=${allowed}`);

  return (
    <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-8 sm:px-6 sm:pt-12 lg:px-8">
      <div className="animate-float pointer-events-none absolute left-1/3 top-0 h-64 w-64 rounded-full bg-[#4c6fff]/20 blur-[110px]" aria-hidden />
      <header className="relative mb-8">
        <div className="glass mb-4 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium text-foreground/75">
          <Sparkles className="h-3.5 w-3.5 text-[#a855f7]" />
          AIVEXA PRO
        </div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
          AI <span className="neon-text">Studio</span>
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-foreground/65 sm:text-base">{s.subtitle}</p>
      </header>

      {allowed ? (
        <ProStudio initialBalance={balance} formats={formats} />
      ) : (
        <section className="glass-strong neon-border relative mx-auto max-w-xl rounded-3xl p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#4c6fff] to-[#a855f7] glow-primary">
            <Lock className="h-5 w-5 text-white" />
          </div>
          <h2 className="font-display text-xl font-bold text-white">{user ? s.lockedTitle : s.signInTitle}</h2>
          <p className="mt-2 text-sm text-foreground/65">{s.lockedText}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {!user && (
              <Link href="/login?redirect=/pro/studio" className="glass rounded-xl px-5 py-2.5 text-sm font-semibold text-white">
                {s.signIn}
              </Link>
            )}
            <Link href="/pro" className="rounded-xl bg-gradient-to-r from-[#4c6fff] to-[#a855f7] px-5 py-2.5 text-sm font-semibold text-white glow-primary">
              {s.getPro}
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
