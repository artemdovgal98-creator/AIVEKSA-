"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signUp } from "@/lib/auth-client";
import { useLang } from "@/lib/i18n/context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2 } from "lucide-react";

function RegisterForm() {
  const { t } = useLang();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (password.length < 6) {
      setError(t.auth.minPassword);
      return;
    }
    setLoading(true);

    try {
      const result = await signUp.email({ email, password, name });
      if (result.error) {
        console.error("[register] sign up failed:", result.error);
        setError(result.error.message || t.common.error);
        setLoading(false);
        return;
      }
      setTimeout(() => {
        window.location.href = redirect;
      }, 400);
    } catch (err: any) {
      console.error("[register] error:", err);
      setError(err?.message || t.common.error);
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-200px)] max-w-md items-center px-4 py-10">
      <div className="glass-strong animate-fade-up w-full rounded-3xl p-6 sm:p-8">
        <div className="mb-6 text-center">
          <Link href="/" className="font-display text-2xl font-extrabold tracking-tight text-white">
            AI<span className="neon-text">VEXA</span>
          </Link>
          <h1 className="font-display mt-4 text-xl font-bold text-white">{t.auth.registerTitle}</h1>
          <p className="mt-1.5 text-sm text-foreground/55">{t.auth.registerSub}</p>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-xl bg-rose-500/12 px-4 py-3 text-sm text-rose-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-foreground/70">
              {t.auth.name}
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              autoComplete="name"
              className="h-12 rounded-xl border-white/10 bg-white/5 text-white placeholder:text-foreground/30"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-foreground/70">
              {t.auth.email}
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="h-12 rounded-xl border-white/10 bg-white/5 text-white placeholder:text-foreground/30"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-foreground/70">
              {t.auth.password}
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              placeholder="••••••••"
              className="h-12 rounded-xl border-white/10 bg-white/5 text-white placeholder:text-foreground/30"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="glow-primary h-12 w-full rounded-xl bg-gradient-to-r from-[#4c6fff] to-[#a855f7] text-base font-bold text-white"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? t.auth.loading : t.auth.signUp}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-foreground/50">
          {t.auth.hasAccount}{" "}
          <Link href="/login" className="font-semibold text-white hover:underline">
            {t.auth.signIn}
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="py-24 text-center text-sm text-foreground/40">…</div>}>
      <RegisterForm />
    </Suspense>
  );
}
