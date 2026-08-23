"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLang } from "@/lib/i18n/context";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Loader2, X } from "lucide-react";
import type { ClickRecord, ServiceRecord } from "@/lib/types";

const PAGE_SIZE = 50;

function AdminClicksView() {
  const { t } = useLang();
  const searchParams = useSearchParams();
  const serviceSlug = searchParams.get("service") || "";
  const [clicks, setClicks] = useState<ClickRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = async (nextOffset: number, append: boolean) => {
    setLoading(true);
    const query = serviceSlug ? `&service=${encodeURIComponent(serviceSlug)}` : "";
    const response = await api.get<ClickRecord[]>(
      `/api/admin/clicks?limit=${PAGE_SIZE}&offset=${nextOffset}${query}`
    );
    if (!response.ok) {
      console.error("[admin] failed to load clicks:", response.error);
    } else {
      setClicks((current) => (append ? [...current, ...(response.data || [])] : response.data || []));
      setTotal(response.total || 0);
      setOffset(nextOffset);
    }
    setLoading(false);
  };

  useEffect(() => {
    load(0, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceSlug]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-foreground/55">
          {t.admin.stats.clicks}: <span className="font-bold text-white">{total}</span>
        </p>
        {serviceSlug && (
          <Link
            href="/admin/clicks"
            className="glass glass-hover flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-foreground/75"
          >
            {serviceSlug}
            <X className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>

      {loading && clicks.length === 0 ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-foreground/40" />
        </div>
      ) : clicks.length === 0 ? (
        <div className="glass rounded-2xl px-6 py-14 text-center text-sm text-foreground/50">
          {t.admin.stats.noData}
        </div>
      ) : (
        <>
          <div className="glass overflow-x-auto rounded-2xl">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-white/8 text-xs uppercase tracking-wide text-foreground/40">
                <tr>
                  <th className="px-4 py-3 font-semibold">AI</th>
                  <th className="px-4 py-3 font-semibold">Device</th>
                  <th className="px-4 py-3 font-semibold">Lang</th>
                  <th className="px-4 py-3 font-semibold">Country</th>
                  <th className="px-4 py-3 font-semibold">Affiliate</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody>
                {clicks.map((click) => {
                  const service = (typeof click.service === "object" ? click.service : null) as ServiceRecord | null;
                  return (
                    <tr key={click._id} className="border-b border-white/5 last:border-0">
                      <td className="px-4 py-2.5 font-medium text-white">{service?.name || "—"}</td>
                      <td className="px-4 py-2.5 text-foreground/60">{click.device || "—"}</td>
                      <td className="px-4 py-2.5 uppercase text-foreground/60">{click.language || "—"}</td>
                      <td className="px-4 py-2.5 text-foreground/60">{click.country || "—"}</td>
                      <td className="px-4 py-2.5">
                        {click.affiliate_click === "yes" ? (
                          <span className="rounded-md bg-emerald-400/12 px-2 py-0.5 text-xs font-semibold text-emerald-300">
                            {t.common.yes}
                          </span>
                        ) : (
                          <span className="text-xs text-foreground/35">{t.common.no}</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-xs text-foreground/45">
                        {click.clicked_at ? new Date(click.clicked_at).toLocaleString() : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {clicks.length < total && (
            <div className="flex justify-center">
              <Button
                onClick={() => load(offset + PAGE_SIZE, true)}
                disabled={loading}
                variant="outline"
                className="border-white/15 bg-white/5 px-8"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {clicks.length} / {total}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function AdminClicksPage() {
  return (
    <Suspense fallback={<div className="py-16 text-center text-sm text-foreground/40">…</div>}>
      <AdminClicksView />
    </Suspense>
  );
}
