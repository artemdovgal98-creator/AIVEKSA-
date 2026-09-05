"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLang } from "@/lib/i18n/context";
import { BarChart3, FileText, Handshake, Image, LayoutGrid, MousePointerClick, Sparkles, Tags, ArrowLeft } from "lucide-react";

const ITEMS = [
  { href: "/admin", key: "dashboard", icon: BarChart3 },
  { href: "/admin/services", key: "services", icon: Sparkles },
  { href: "/admin/affiliates", key: "affiliates", icon: Handshake },
  { href: "/admin/offers", key: "offers", icon: Tags },
  { href: "/admin/categories", key: "categories", icon: LayoutGrid },
  { href: "/admin/articles", key: "articles", icon: FileText },
  { href: "/admin/banners", key: "banners", icon: Image },
  { href: "/admin/clicks", key: "clicks", icon: MousePointerClick },
] as const;

export function AdminShell({ children, adminName }: { children: React.ReactNode; adminName: string }) {
  const { t } = useLang();
  const pathname = usePathname();

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-extrabold text-white sm:text-2xl">{t.admin.title}</h1>
          <p className="mt-0.5 text-xs text-foreground/45">{adminName}</p>
        </div>
        <Link
          href="/"
          className="glass glass-hover flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold text-foreground/75"
        >
          <ArrowLeft className="h-4 w-4" />
          {t.nav.home}
        </Link>
      </header>

      <nav className="no-scrollbar mb-5 flex gap-2 overflow-x-auto">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all ${
                active
                  ? "bg-gradient-to-r from-[#4c6fff] to-[#a855f7] text-white"
                  : "glass text-foreground/65 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.admin[item.key]}
            </Link>
          );
        })}
      </nav>

      {children}
    </div>
  );
}
