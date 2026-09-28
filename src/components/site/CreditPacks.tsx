"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Coins, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useLang } from "@/lib/i18n/context";
import { publicDict } from "@/lib/i18n/public-dict";

export interface PublicCreditPack {
  id: string;
  credits: number;
  price: number;
  symbol: string;
}

/** One-time credit packs. Only the pack id is sent — the price is read on the server. */
export function CreditPacks({
  packs,
  signedIn,
  paymentsConfigured,
}: {
  packs: PublicCreditPack[];
  signedIn: boolean;
  paymentsConfigured: boolean;
}) {
  const { lang } = useLang();
  const p = publicDict(lang).pro;
  const [busy, setBusy] = useState<string | null>(null);
  if (packs.length === 0) return null;

  // "Best value" = lowest price per credit, shown only when there is a choice.
  const best = packs.length > 1 ? packs.reduce((a, b) => (b.price / b.credits < a.price / a.credits ? b : a)).id : null;

  const buy = async (id: string) => {
    setBusy(id);
    const response = await api.post<{ url: string }>("/api/billing/checkout", { pack: id });
    if (!response.ok || !response.data?.url) {
      setBusy(null);
      console.error("[credit-packs] checkout failed:", response.error);
      toast.error(response.error === "NOT_CONFIGURED" ? p.notConfigured : String(response.error || "Error"));
      return;
    }
    console.log("[credit-packs] redirecting to checkout for", id);
    window.location.href = response.data.url;
  };

  const buttonClass =
    "mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-white/15 disabled:opacity-50";

  return (
    <section id="credits" className="relative mt-14 scroll-mt-24">
      <div className="text-center">
        <h2 className="font-display text-2xl font-extrabold text-white sm:text-3xl">
          <Coins className="mr-2 inline h-6 w-6 -translate-y-0.5 text-amber-300" />
          {p.packsTitle}
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-foreground/60">{p.packsSub}</p>
      </div>

      <div className="mt-7 grid gap-4 sm:grid-cols-3">
        {packs.map((pack) => {
          const highlight = pack.id === best;
          return (
            <div
              key={pack.id}
              className={`relative rounded-3xl p-6 text-center ${highlight ? "glass-strong neon-border" : "glass"}`}
            >
              {highlight && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-amber-300 to-orange-400 px-3 py-0.5 text-[11px] font-bold uppercase tracking-wide text-black">
                  {p.popular}
                </span>
              )}
              <p className="font-display text-4xl font-extrabold text-white">{pack.credits}</p>
              <p className="text-xs uppercase tracking-wide text-foreground/50">AI credits</p>
              <p className="font-display mt-4 text-2xl font-bold text-white">
                {pack.symbol}
                {pack.price.toFixed(2)}
              </p>
              <p className="text-[11px] text-foreground/45">
                {pack.symbol}
                {(pack.price / pack.credits).toFixed(3)} {p.perCredit}
              </p>
              {!paymentsConfigured ? (
                <button type="button" disabled className={buttonClass}>
                  {p.buy}
                </button>
              ) : !signedIn ? (
                <Link href="/login?redirect=/pro" className={buttonClass}>
                  {p.buy}
                </Link>
              ) : (
                <button type="button" className={buttonClass} disabled={busy !== null} onClick={() => buy(pack.id)}>
                  {busy === pack.id && <Loader2 className="h-4 w-4 animate-spin" />}
                  {p.buy}
                </button>
              )}
            </div>
          );
        })}
      </div>
      {!paymentsConfigured && (
        <p className="mt-4 text-center text-xs font-bold uppercase tracking-wide text-amber-300">
          {p.notConfigured} · NOT CONFIGURED
        </p>
      )}
    </section>
  );
}
