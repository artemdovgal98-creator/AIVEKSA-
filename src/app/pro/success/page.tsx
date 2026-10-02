"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";
import { api } from "@/lib/api";
import { useLang } from "@/lib/i18n/context";
import { publicDict } from "@/lib/i18n/public-dict";

function SuccessInner() {
  const { lang } = useLang();
  const p = publicDict(lang).pro;
  const params = useSearchParams();
  const sessionId = params.get("session_id") || "";
  const [status, setStatus] = useState<string>("checking");
  const [kind, setKind] = useState<string>("plan");

  useEffect(() => {
    if (!sessionId) {
      setStatus("failed");
      return;
    }
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      // The server re-reads the session from Stripe; the browser is never trusted.
      const response = await api.post<{ status: string; kind?: string }>("/api/billing/confirm", { session_id: sessionId });
      if (response.ok && response.data?.kind) setKind(response.data.kind);
      const next = response.ok ? response.data?.status || "pending" : "failed";
      console.log("[pro/success] payment status:", next);
      setStatus(next);
      if (next === "pending" && attempts++ < 10) timer = setTimeout(poll, 3000);
    };
    poll();
    return () => clearTimeout(timer);
  }, [sessionId]);

  const view =
    status === "paid"
      ? { icon: <CheckCircle2 className="h-12 w-12 text-emerald-300" />, text: kind === "credits" ? p.successCredits : p.successPaid }
      : status === "pending" || status === "checking"
        ? { icon: status === "checking" ? <Loader2 className="h-12 w-12 animate-spin text-foreground/50" /> : <Clock className="h-12 w-12 text-amber-300" />, text: status === "checking" ? p.success : p.successPending }
        : { icon: <XCircle className="h-12 w-12 text-rose-300" />, text: p.successFailed };

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md items-center px-4">
      <div className="glass-strong neon-border w-full rounded-3xl p-8 text-center">
        <div className="mx-auto mb-4 w-fit">{view.icon}</div>
        <p className="font-display text-lg font-bold text-white">{view.text}</p>
        <Link href="/profile#billing" className="mt-6 inline-block rounded-xl bg-gradient-to-r from-[#4c6fff] to-[#a855f7] px-6 py-3 text-sm font-bold text-white">
          {p.toProfile}
        </Link>
      </div>
    </div>
  );
}

export default function ProSuccessPage() {
  return (
    <Suspense fallback={null}>
      <SuccessInner />
    </Suspense>
  );
}
