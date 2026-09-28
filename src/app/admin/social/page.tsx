"use client";

import { CalendarClock, Share2, Sparkles } from "lucide-react";
import { useAdminDict } from "@/lib/i18n/admin-dict";
import { NotConfigured, PageHeader } from "@/components/admin/kit";

/** Social Studio / Zernio — Stage 2. Shown honestly as NOT CONFIGURED, no simulated data. */
export default function AdminSocialPage() {
  const a = useAdminDict();
  const d = a.social;
  return (
    <div>
      <PageHeader title={d.title} subtitle={d.subtitle} actions={<NotConfigured />} />
      <div className="glass-strong neon-border relative overflow-hidden rounded-3xl p-8 text-center">
        <div className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full bg-[color:var(--neon-cyan)]/15 blur-3xl" />
        <div className="relative mx-auto max-w-lg">
          <div className="mx-auto mb-4 flex w-fit gap-2">
            {[Share2, CalendarClock, Sparkles].map((Icon, index) => (
              <span key={index} className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#4c6fff] to-[#a855f7]">
                <Icon className="h-5 w-5 text-white" />
              </span>
            ))}
          </div>
          <p className="text-sm leading-relaxed text-foreground/70">{d.stage2}</p>
          <p className="mt-3 text-xs text-foreground/45">{d.envHint}</p>
        </div>
      </div>
    </div>
  );
}
