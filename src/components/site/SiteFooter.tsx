"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLang } from "@/lib/i18n/context";
import { Sparkles } from "lucide-react";

export function SiteFooter() {
  const { t } = useLang();
  const pathname = usePathname();

  if (pathname.startsWith("/admin")) return null;

  return (
    <footer className="mt-20 border-t border-white/10 bg-black/20">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#4c6fff] via-[#7c5cff] to-[#22d3ee]">
                <Sparkles className="h-4 w-4 text-white" />
              </span>
              <span className="font-display text-base font-extrabold">
                AI<span className="neon-text">VEXA</span>
              </span>
            </div>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-foreground/60">
              {t.home.subtitle}
            </p>
          </div>

          <div>
            <p className="mb-3 text-sm font-semibold text-white">{t.nav.catalog}</p>
            <ul className="space-y-2 text-sm text-foreground/60">
              <li><Link href="/catalog" className="hover:text-white">{t.catalog.title}</Link></li>
              <li><Link href="/match" className="hover:text-white">{t.match.title}</Link></li>
              <li><Link href="/tools" className="hover:text-white">{t.tools.title}</Link></li>
              <li><Link href="/guide" className="hover:text-white">{t.guide.title}</Link></li>
            </ul>
          </div>

          <div>
            <p className="mb-3 text-sm font-semibold text-white">AIVEXA</p>
            <ul className="space-y-2 text-sm text-foreground/60">
              <li><Link href="/favorites" className="hover:text-white">{t.favorites.title}</Link></li>
              <li><Link href="/profile" className="hover:text-white">{t.nav.profile}</Link></li>
              <li><Link href="/privacy-policy" className="hover:text-white">Privacy</Link></li>
              <li><Link href="/terms-of-service" className="hover:text-white">Terms</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-white/10 pt-6 text-xs text-foreground/45 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} AIVEXA</p>
          <p>{t.service.affiliateNote}</p>
        </div>
      </div>
    </footer>
  );
}
