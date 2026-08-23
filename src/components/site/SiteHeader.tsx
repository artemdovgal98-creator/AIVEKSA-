"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useLang } from "@/lib/i18n/context";
import { useSession, signOut } from "@/lib/auth-client";
import { api } from "@/lib/api";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Sparkles, LayoutGrid, Wand2, Wrench, Star, BookOpen, User, Shield, LogOut } from "lucide-react";

export function SiteHeader() {
  const { t } = useLang();
  const pathname = usePathname();
  const { data: session } = useSession();
  const [role, setRole] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!session?.user) {
      setRole(null);
      return;
    }
    api.get<{ role: string } | null>("/api/me").then((response) => {
      if (cancelled) return;
      if (!response.ok) {
        console.error("[header] failed to load profile:", response.error);
        return;
      }
      setRole(response.data?.role || "user");
    });
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const links = [
    { href: "/catalog", label: t.nav.catalog, icon: LayoutGrid },
    { href: "/match", label: t.nav.match, icon: Wand2 },
    { href: "/tools", label: t.nav.tools, icon: Wrench },
    { href: "/guide", label: t.nav.guide, icon: BookOpen },
    { href: "/favorites", label: t.nav.favorites, icon: Star },
  ];

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        scrolled ? "glass-strong border-b border-white/10" : "border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="group flex shrink-0 items-center gap-2">
          <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#4c6fff] via-[#7c5cff] to-[#22d3ee] shadow-[0_0_22px_-4px_rgba(124,145,255,0.9)]">
            <Sparkles className="h-4.5 w-4.5 text-white" strokeWidth={2.4} />
          </span>
          <span className="font-display text-lg font-extrabold tracking-tight">
            AI<span className="neon-text">VEXA</span>
          </span>
        </Link>

        <nav className="ml-4 hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
                isActive(link.href)
                  ? "bg-white/10 text-white"
                  : "text-foreground/70 hover:bg-white/5 hover:text-white"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <LanguageSwitcher />

          {role === "admin" && (
            <Link href="/admin" className="hidden md:block">
              <Button variant="outline" size="sm" className="gap-1.5 border-white/15 bg-white/5">
                <Shield className="h-4 w-4" />
                {t.nav.admin}
              </Button>
            </Link>
          )}

          {session?.user ? (
            <Link href="/profile" className="hidden md:block">
              <Button size="sm" className="gap-1.5 bg-gradient-to-r from-[#4c6fff] to-[#a855f7] text-white">
                <User className="h-4 w-4" />
                {t.nav.profile}
              </Button>
            </Link>
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <Link href="/login">
                <Button variant="ghost" size="sm" className="text-foreground/80">
                  {t.nav.login}
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm" className="bg-gradient-to-r from-[#4c6fff] to-[#a855f7] text-white">
                  {t.nav.register}
                </Button>
              </Link>
            </div>
          )}

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                aria-label={t.nav.menu}
                className="glass glass-hover flex h-10 w-10 items-center justify-center rounded-full md:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="glass-strong w-[86vw] max-w-sm border-white/10 p-0">
              <SheetTitle className="sr-only">{t.nav.menu}</SheetTitle>
              <div className="flex h-full flex-col gap-1 overflow-y-auto p-5 pt-6">
                <p className="font-display mb-3 text-lg font-bold">
                  AI<span className="neon-text">VEXA</span>
                </p>
                {links.map((link) => {
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`flex items-center gap-3 rounded-xl px-3 py-3 text-base font-medium transition-colors ${
                        isActive(link.href) ? "bg-white/10 text-white" : "text-foreground/80 hover:bg-white/5"
                      }`}
                    >
                      <Icon className="h-5 w-5 text-[color:var(--neon-cyan)]" />
                      {link.label}
                    </Link>
                  );
                })}

                <div className="my-3 h-px bg-white/10" />

                {role === "admin" && (
                  <Link
                    href="/admin"
                    className="flex items-center gap-3 rounded-xl px-3 py-3 text-base font-medium text-foreground/80 hover:bg-white/5"
                  >
                    <Shield className="h-5 w-5 text-[color:var(--neon-violet)]" />
                    {t.nav.admin}
                  </Link>
                )}

                {session?.user ? (
                  <>
                    <Link
                      href="/profile"
                      className="flex items-center gap-3 rounded-xl px-3 py-3 text-base font-medium text-foreground/80 hover:bg-white/5"
                    >
                      <User className="h-5 w-5 text-[color:var(--neon-cyan)]" />
                      {t.nav.profile}
                    </Link>
                    <button
                      type="button"
                      onClick={() => signOut().then(() => (window.location.href = "/"))}
                      className="flex items-center gap-3 rounded-xl px-3 py-3 text-left text-base font-medium text-foreground/80 hover:bg-white/5"
                    >
                      <LogOut className="h-5 w-5" />
                      {t.nav.logout}
                    </button>
                  </>
                ) : (
                  <div className="mt-2 flex flex-col gap-2">
                    <Link href="/login">
                      <Button variant="outline" className="w-full border-white/15 bg-white/5">
                        {t.nav.login}
                      </Button>
                    </Link>
                    <Link href="/register">
                      <Button className="w-full bg-gradient-to-r from-[#4c6fff] to-[#a855f7] text-white">
                        {t.nav.register}
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
