import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { getServerDict } from "@/lib/i18n/server";
import { AdminShell } from "@/components/admin/AdminShell";
import { ShieldAlert } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const { t } = await getServerDict();

  // Authoritative server-side guard — the role is read from the database,
  // never from a cookie or client state.
  if (!admin) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md items-center px-4">
        <div className="glass-strong w-full rounded-3xl p-8 text-center">
          <ShieldAlert className="mx-auto mb-4 h-10 w-10 text-rose-300" />
          <h1 className="font-display text-xl font-bold text-white">{t.admin.accessDenied}</h1>
          <p className="mt-2 text-sm text-foreground/55">{t.admin.accessDeniedSub}</p>
          <Link
            href="/"
            className="mt-6 inline-block rounded-xl bg-gradient-to-r from-[#4c6fff] to-[#a855f7] px-6 py-3 text-sm font-bold text-white"
          >
            {t.nav.home}
          </Link>
        </div>
      </div>
    );
  }

  return <AdminShell adminName={admin.email || admin.name || ""}>{children}</AdminShell>;
}
