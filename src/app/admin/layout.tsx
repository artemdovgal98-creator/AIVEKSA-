import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";
import { AdminShell } from "@/components/admin/AdminShell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();

  // Authoritative server-side guard — the role is read from the database,
  // never from a cookie or client state. Non-admins (and anonymous visitors)
  // are bounced straight to the homepage, no admin UI is ever shown to them.
  if (!admin) {
    redirect("/");
  }

  return <AdminShell adminName={admin.email || admin.name || ""}>{children}</AdminShell>;
}
