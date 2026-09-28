"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLang } from "@/lib/i18n/context";
import { useAdminDict } from "@/lib/i18n/admin-dict";
import {
  ArrowLeft,
  BarChart3,
  Coins,
  CreditCard,
  FileText,
  Handshake,
  Image,
  LayoutGrid,
  MousePointerClick,
  Radar,
  Repeat,
  Send,
  Settings,
  Share2,
  ShoppingBag,
  Sparkles,
  Tags,
  Users,
  Webhook,
  ArrowLeftRight,
} from "lucide-react";

type MenuKey = keyof ReturnType<typeof useAdminDict>["menu"];

// Final Stage 1 admin menu (order from the spec) + the existing content tools.
const MAIN: { href: string; key: MenuKey; icon: typeof BarChart3 }[] = [
  { href: "/admin", key: "dashboard", icon: BarChart3 },
  { href: "/admin/users", key: "users", icon: Users },
  { href: "/admin/plans", key: "plans", icon: Tags },
  { href: "/admin/orders", key: "orders", icon: ShoppingBag },
  { href: "/admin/subscriptions", key: "subscriptions", icon: Repeat },
  { href: "/admin/transactions", key: "transactions", icon: ArrowLeftRight },
  { href: "/admin/payments", key: "payments", icon: CreditCard },
  { href: "/admin/services", key: "catalog", icon: Sparkles },
  { href: "/admin/categories", key: "categories", icon: LayoutGrid },
  { href: "/admin/affiliates", key: "marketplace", icon: Handshake },
  { href: "/admin/social", key: "social", icon: Share2 },
  { href: "/admin/credits", key: "credits", icon: Coins },
  { href: "/admin/telegram", key: "telegram", icon: Send },
  { href: "/admin/webhooks", key: "webhooks", icon: Webhook },
  { href: "/admin/settings", key: "settings", icon: Settings },
];

const CONTENT: { href: string; key: MenuKey; icon: typeof BarChart3 }[] = [
  { href: "/admin/radar", key: "radar", icon: Radar },
  { href: "/admin/articles", key: "articles", icon: FileText },
  { href: "/admin/banners", key: "banners", icon: Image },
  { href: "/admin/clicks", key: "clicks", icon: MousePointerClick },
];

export function AdminShell({ children, adminName }: { children: React.ReactNode; adminName: string }) {
  const { t } = useLang();
  const d = useAdminDict();
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  const link = (item: (typeof MAIN)[number], compact = false) => {
    const Icon = item.icon;
    const active = isActive(item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        className={`flex shrink-0 items-center gap-2.5 rounded-xl text-sm font-semibold transition-all ${
          compact ? "px-3.5 py-2.5" : "px-3 py-2"
        } ${
          active
            ? "bg-gradient-to-r from-[#4c6fff] to-[#a855f7] text-white shadow-[0_0_18px_rgba(124,92,255,0.35)]"
            : compact
              ? "glass text-foreground/65 hover:text-white"
              : "text-foreground/60 hover:bg-white/5 hover:text-white"
        }`}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="truncate">{d.menu[item.key]}</span>
      </Link>
    );
  };

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
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

      {/* Mobile / tablet: horizontal rail */}
      <nav className="rail no-scrollbar mb-5 flex lg:hidden">
        {[...MAIN, ...CONTENT].map((item) => link(item, true))}
      </nav>

      <div className="lg:grid lg:grid-cols-[230px_minmax(0,1fr)] lg:gap-6">
        <aside className="hidden lg:block">
          <nav className="glass sticky top-20 space-y-0.5 rounded-2xl p-2.5">
            {MAIN.map((item) => link(item))}
            <p className="px-3 pb-1 pt-4 text-[10px] font-bold uppercase tracking-[0.16em] text-foreground/35">
              {d.menu.content}
            </p>
            {CONTENT.map((item) => link(item))}
          </nav>
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
