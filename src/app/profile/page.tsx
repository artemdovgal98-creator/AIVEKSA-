"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "@/lib/auth-client";
import { useLang } from "@/lib/i18n/context";
import { LANGS } from "@/lib/i18n/dictionaries";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { LogOut, Mail, Shield, Star, Loader2 } from "lucide-react";
import type { Lang } from "@/lib/types";

interface MeResponse {
  id: string;
  name: string;
  email: string;
  role: string;
  language: string | null;
  createdAt?: string;
  favoritesCount: number;
}

export default function ProfilePage() {
  const router = useRouter();
  const { lang, setLang, t } = useLang();
  const { data: session, isPending } = useSession();
  const [me, setMe] = useState<MeResponse | null>(null);

  useEffect(() => {
    if (isPending) return;
    if (!session?.user) {
      router.replace("/login?redirect=/profile");
      return;
    }

    api.get<MeResponse | null>("/api/me").then((response) => {
      if (!response.ok) {
        console.error("[profile] failed to load profile:", response.error);
        return;
      }
      setMe(response.data || null);
    });
  }, [session, isPending, router]);

  const handleLogout = async () => {
    await signOut();
    window.location.href = "/";
  };

  if (isPending || !session?.user) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-foreground/40" />
      </div>
    );
  }

  const user = session.user;
  const initial = (user.name || user.email || "U").charAt(0).toUpperCase();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="font-display mb-6 text-2xl font-extrabold text-white sm:text-3xl">
        {t.auth.profileTitle}
      </h1>

      <section className="glass-strong animate-fade-up relative overflow-hidden rounded-3xl p-6">
        <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-[color:var(--neon-blue)]/18 blur-3xl" />
        <div className="relative flex items-center gap-4">
          <span className="font-display flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#4c6fff] to-[#a855f7] text-2xl font-extrabold text-white">
            {initial}
          </span>
          <div className="min-w-0">
            <p className="font-display truncate text-xl font-bold text-white">{user.name || "—"}</p>
            <p className="flex items-center gap-1.5 truncate text-sm text-foreground/55">
              <Mail className="h-3.5 w-3.5" />
              {user.email}
            </p>
          </div>
        </div>

        <div className="relative mt-6 grid gap-3 sm:grid-cols-2">
          <div className="glass rounded-2xl px-4 py-3">
            <p className="font-display flex items-center gap-2 text-2xl font-extrabold text-white">
              <Star className="h-5 w-5 text-amber-300" />
              {me?.favoritesCount ?? 0}
            </p>
            <p className="mt-0.5 text-xs text-foreground/45">{t.auth.savedServices}</p>
          </div>
          <div className="glass rounded-2xl px-4 py-3">
            <p className="font-display text-base font-bold text-white">
              {me?.createdAt ? new Date(me.createdAt).toLocaleDateString() : "—"}
            </p>
            <p className="mt-0.5 text-xs text-foreground/45">{t.auth.memberSince}</p>
          </div>
        </div>
      </section>

      <section className="glass animate-fade-up mt-4 rounded-3xl p-6">
        <h2 className="font-display mb-4 text-base font-bold text-white">{t.auth.language}</h2>
        <div className="flex flex-wrap gap-2">
          {LANGS.map((entry) => (
            <button
              key={entry.code}
              type="button"
              onClick={() => setLang(entry.code as Lang)}
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                lang === entry.code
                  ? "bg-gradient-to-r from-[#4c6fff] to-[#a855f7] text-white"
                  : "bg-white/6 text-foreground/70 hover:text-white"
              }`}
            >
              {entry.flag} {entry.label}
            </button>
          ))}
        </div>
      </section>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <Button asChild variant="outline" className="h-12 flex-1 rounded-2xl border-white/12 bg-white/5">
          <Link href="/favorites">
            <Star className="mr-2 h-4 w-4" />
            {t.favorites.title}
          </Link>
        </Button>

        {me?.role === "admin" && (
          <Button asChild className="h-12 flex-1 rounded-2xl bg-gradient-to-r from-[#4c6fff] to-[#a855f7] text-white">
            <Link href="/admin">
              <Shield className="mr-2 h-4 w-4" />
              {t.auth.adminPanel}
            </Link>
          </Button>
        )}

        <Button
          onClick={handleLogout}
          variant="ghost"
          className="h-12 rounded-2xl text-rose-300 hover:bg-rose-500/10 hover:text-rose-200"
        >
          <LogOut className="mr-2 h-4 w-4" />
          {t.nav.logout}
        </Button>
      </div>
    </div>
  );
}
