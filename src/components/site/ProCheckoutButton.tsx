"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Crown, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { openPaddleCheckout, type PaddleCheckoutData } from "@/lib/paddle-client";
import { useLang } from "@/lib/i18n/context";
import { publicDict } from "@/lib/i18n/public-dict";

/**
 * Opens the Paddle checkout for a plan. Only the plan slug is sent — the price
 * is always read from the database on the server.
 */
export function ProCheckoutButton({
  planSlug,
  signedIn,
  paymentsConfigured,
  activeUntil,
}: {
  planSlug: string;
  signedIn: boolean;
  paymentsConfigured: boolean;
  activeUntil: string | null;
}) {
  const { lang } = useLang();
  const p = publicDict(lang).pro;
  const [busy, setBusy] = useState(false);

  const buttonClass =
    "flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#4c6fff] via-[#7c5cff] to-[#a855f7] px-6 py-4 text-base font-bold text-white transition-all hover:shadow-[0_14px_40px_-14px_rgba(124,145,255,1)] disabled:opacity-60";

  if (activeUntil) {
    return (
      <Link href="/profile#billing" className={buttonClass}>
        <Crown className="h-5 w-5" />
        {p.active} {new Date(activeUntil).toLocaleDateString()}
      </Link>
    );
  }

  if (!paymentsConfigured) {
    return (
      <div className="space-y-2 text-center">
        <button type="button" disabled className={buttonClass}>
          <Crown className="h-5 w-5" />
          {p.subscribe}
        </button>
        <p className="text-xs font-bold uppercase tracking-wide text-amber-300">{p.notConfigured} · NOT CONFIGURED</p>
        <p className="text-xs text-foreground/50">{p.notConfiguredSub}</p>
      </div>
    );
  }

  if (!signedIn) {
    return (
      <Link href="/login?redirect=/pro" className={buttonClass}>
        <Crown className="h-5 w-5" />
        {p.loginRequired}
      </Link>
    );
  }

  const start = async () => {
    setBusy(true);
    const response = await api.post<PaddleCheckoutData>("/api/billing/checkout", { plan: planSlug });
    if (!response.ok || !response.data?.priceId) {
      setBusy(false);
      console.error("[pro] checkout failed:", response.error);
      toast.error(response.error === "NOT_CONFIGURED" ? p.notConfigured : String(response.error || "Error"));
      return;
    }
    console.log("[pro] opening Paddle checkout");
    try {
      await openPaddleCheckout(response.data, lang, () => setBusy(false));
    } catch (err) {
      console.error("[pro] Paddle.js failed:", err);
      toast.error(String((err as Error)?.message || "Checkout error"));
    }
    setBusy(false);
  };

  return (
    <button type="button" className={buttonClass} disabled={busy} onClick={start}>
      {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Crown className="h-5 w-5" />}
      {p.subscribe}
    </button>
  );
}
