"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLang } from "@/lib/i18n/context";
import { Home, LayoutGrid, Wrench, Star, User } from "lucide-react";

/** Mobile-first bottom navigation (hidden from md upwards). */
export function BottomNav() {
  const pathname = usePathname();
  const { t } = useLang();

  if (pathname.startsWith("/admin")) return null;

  const items = [
    { href: "/", label: t.nav.home, icon: Home },
    { href: "/catalog", label: t.nav.catalog, icon: LayoutGrid },
    { href: "/tools", label: t.nav.tools, icon: Wrench },
    { href: "/favorites", label: t.nav.favorites, icon: Star },
    { href: "/profile", label: t.nav.profile, icon: User },
  ];

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav className="glass-strong fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 md:hidden">
      <ul className="mx-auto flex max-w-lg items-stretch justify-between px-1 pb-[env(safe-area-inset-bottom,0px)]">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={`flex flex-col items-center gap-1 px-1 py-2.5 text-[11px] font-medium transition-colors ${
                  active ? "text-white" : "text-foreground/55"
                }`}
              >
                <span
                  className={`flex h-8 w-12 items-center justify-center rounded-full transition-all ${
                    active
                      ? "bg-gradient-to-r from-[#4c6fff]/35 to-[#a855f7]/35 shadow-[0_0_18px_-6px_rgba(124,145,255,0.9)]"
                      : ""
                  }`}
                >
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <span className="truncate">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
