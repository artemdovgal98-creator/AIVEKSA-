"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ExternalLink, Eye, EyeOff, Handshake, Pencil, Plus, Search } from "lucide-react";
import { api } from "@/lib/api";
import { useLang } from "@/lib/i18n/context";
import { useAdminDict } from "@/lib/i18n/admin-dict";
import { categoryName, serviceDescription, serviceLogo, serviceTitle } from "@/lib/localize";
import { ServiceFormDialog, type ServiceFormValue } from "@/components/admin/catalog/ServiceFormDialog";
import { EmptyState, ErrorState, LoadingBlock, PageHeader, Pill, Segmented, type SegmentedProps, StatusPill, ghostButton, inputClass, primaryButton } from "@/components/admin/kit";
import type { CategoryRecord, ServiceRecord } from "@/lib/types";

// Typed aliases: JSX generic arguments are not supported by the build pipeline.
const SegmentedScope = Segmented as (props: SegmentedProps<Scope>) => React.JSX.Element;

interface AdminService extends ServiceRecord {
  partner_url: string;
  partner_live: boolean;
  partner_status: string | null;
  partner_network: string | null;
  partner_slug: string | null;
  offers_count: number;
}

type Scope = "all" | "main" | "affiliate";
const PAGE = 48;
const EMPTY_FORM: ServiceFormValue = { title: "", description: "", official_url: "", partner_url: "", partner_enabled: false, image_url: "" };

/** Admin → AI Catalog: cards + the six-field form. */
export default function AdminCatalogPage() {
  const { lang } = useLang();
  const a = useAdminDict();
  const d = a.catalog;
  const [items, setItems] = useState<AdminService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scope, setScope] = useState<Scope>("all");
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(PAGE);
  const [dialog, setDialog] = useState<{ open: boolean; id: string | null; initial: ServiceFormValue }>({
    open: false,
    id: null,
    initial: EMPTY_FORM,
  });

  const load = useCallback(async () => {
    const response = await api.get<AdminService[]>("/api/admin/services");
    if (!response.ok) {
      console.error("[admin/catalog] load failed:", response.error);
      setError(String(response.error || "error"));
    } else {
      setItems(response.data || []);
      setError(null);
      console.log("[admin/catalog] loaded", (response.data || []).length, "services");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(
    () => ({ all: items.length, affiliate: items.filter((s) => s.partner_live).length, main: items.filter((s) => !s.partner_live).length }),
    [items]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((service) => {
      if (scope === "affiliate" && !service.partner_live) return false;
      if (scope === "main" && service.partner_live) return false;
      if (!q) return true;
      return [service.name, service.slug, service.title_ru, service.title_uk, service.title_en]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
  }, [items, scope, query]);

  useEffect(() => setShown(PAGE), [scope, query]);

  const openCreate = () => setDialog({ open: true, id: null, initial: EMPTY_FORM });
  const openEdit = (service: AdminService) =>
    setDialog({
      open: true,
      id: service._id,
      initial: {
        title: serviceTitle(service, lang),
        description: serviceDescription(service, lang),
        official_url: service.official_url || "",
        partner_url: service.partner_url || "",
        partner_enabled: service.is_affiliate === "yes",
        image_url: serviceLogo(service),
      },
    });

  const toggleVisible = async (service: AdminService) => {
    const next = service.active === "no" ? "yes" : "no";
    const response = await api.put(`/api/admin/services/${service._id}`, { active: next });
    if (!response.ok) {
      console.error("[admin/catalog] visibility toggle failed:", response.error);
      toast.error(String(response.error || "Error"));
      return;
    }
    setItems((current) => current.map((s) => (s._id === service._id ? { ...s, active: next } : s)));
  };

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorState>{error}</ErrorState>;

  return (
    <div>
      <PageHeader
        title={d.title}
        subtitle={d.subtitle}
        actions={
          <button type="button" className={primaryButton} onClick={openCreate}>
            <Plus className="h-4 w-4" />
            {d.add}
          </button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SegmentedScope
          value={scope}
          onChange={setScope}
          options={[
            { value: "all", label: d.scopeAll, count: counts.all },
            { value: "main", label: d.scopeMain, count: counts.main },
            { value: "affiliate", label: d.scopeAffiliate, count: counts.affiliate },
          ]}
        />
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/35" />
          <input className={`${inputClass} pl-9`} placeholder={a.common.search} value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState>{a.common.empty}</EmptyState>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.slice(0, shown).map((service) => {
            const logo = serviceLogo(service);
            const title = serviceTitle(service, lang) || service.slug;
            const category = service.category && typeof service.category === "object" ? (service.category as CategoryRecord) : null;
            const partnerOn = service.is_affiliate === "yes";
            const partnerHref = service.partner_live && service.partner_slug ? `/go/${service.partner_slug}` : null;
            const hidden = service.active === "no";
            return (
              <article
                key={service._id}
                className={`glass glass-hover flex flex-col rounded-2xl p-4 transition ${hidden ? "opacity-60" : ""}`}
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/5">
                    {logo ? (
                      <img src={logo} alt="" className="h-full w-full object-contain p-1" />
                    ) : (
                      <span className="font-display text-lg font-bold text-foreground/50">{title.charAt(0).toUpperCase()}</span>
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-display text-sm font-bold text-white">{title}</h3>
                    <p className="mt-0.5 truncate text-[11px] text-foreground/45">
                      {category ? `${category.icon || ""} ${categoryName(category, lang)}` : d.noCategory}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      <Pill tone={partnerOn ? (service.partner_live ? "green" : "amber") : "gray"}>
                        {partnerOn ? d.partnerOn : d.partnerOff}
                      </Pill>
                      {partnerOn && <StatusPill status={service.partner_status} label={service.partner_status ? a.market.status[service.partner_status] : undefined} />}
                      {hidden && <Pill tone="red">{d.hidden}</Pill>}
                    </div>
                  </div>
                </div>

                <p className="mt-3 line-clamp-2 min-h-[2.5rem] text-xs leading-relaxed text-foreground/55">
                  {serviceDescription(service, lang) || "—"}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/6 pt-3">
                  <button type="button" className={`${ghostButton} px-3 py-1.5 text-xs`} onClick={() => openEdit(service)}>
                    <Pencil className="h-3.5 w-3.5" />
                    {a.common.edit.toUpperCase()}
                  </button>
                  {partnerHref ? (
                    <a href={partnerHref} target="_blank" rel="noopener noreferrer" className={`${ghostButton} px-3 py-1.5 text-xs text-emerald-300`}>
                      <Handshake className="h-3.5 w-3.5" />
                      {d.partnerLink}
                    </a>
                  ) : service.official_url ? (
                    <a href={service.official_url} target="_blank" rel="noopener noreferrer nofollow" className={`${ghostButton} px-3 py-1.5 text-xs`}>
                      <ExternalLink className="h-3.5 w-3.5" />
                      {d.openWebsite}
                    </a>
                  ) : null}
                  <button
                    type="button"
                    title={hidden ? d.hidden : d.visible}
                    className="ml-auto rounded-lg p-1.5 text-foreground/45 transition hover:bg-white/8 hover:text-white"
                    onClick={() => toggleVisible(service)}
                  >
                    {hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {filtered.length > shown && (
        <div className="mt-5 flex justify-center">
          <button type="button" className={ghostButton} onClick={() => setShown((n) => n + PAGE)}>
            {d.loadMore} ({filtered.length - shown})
          </button>
        </div>
      )}

      <ServiceFormDialog
        open={dialog.open}
        onOpenChange={(open) => setDialog((current) => ({ ...current, open }))}
        serviceId={dialog.id}
        initial={dialog.initial}
        onSaved={load}
      />
    </div>
  );
}
