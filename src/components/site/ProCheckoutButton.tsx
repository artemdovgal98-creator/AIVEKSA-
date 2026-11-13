"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Crown, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useLang } from "@/lib/i18n/context";
import { publicDict } from "@/lib/i18n/public-dict";

export interface ProCheckoutButtonProps {
  planSlug: string;
  signedIn: boolean;
  paymentsConfigured: boolean;
  activeUntil: string | null;
  period: "month" | "year";
}

/** Redirects to the NOWPayments hosted invoice. Only the plan slug + period are sent — prices always come from the server. */
export function ProCheckoutButton({ planSlug, signedIn, paymentsConfigured, activeUntil, period }: ProCheckoutButtonProps) {
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
        <p className="text-xs font-bold uppercase tracking-wide text-amber-300">{p.notConfigured}</p>
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
    const response = await api.post<{ paymentUrl: string }>("/api/billing/checkout", { plan: planSlug, period });
    if (!response.ok || !response.data?.paymentUrl) {
      setBusy(false);
      console.error("[pro] checkout failed:", response.error);
      toast.error(response.error === "NOT_CONFIGURED" ? p.notConfigured : String(response.error || "Error"));
      return;
    }
    console.log("[pro] redirecting to NOWPayments invoice");
    window.location.href = response.data.paymentUrl;
  };

  return (
    <button type="button" className={buttonClass} disabled={busy} onClick={start}>
      {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Crown className="h-5 w-5" />}
      {p.subscribe}
    </button>
  );
}
