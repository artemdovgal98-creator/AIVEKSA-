"use client";

import { useLang } from "@/lib/i18n/context";
import { api } from "@/lib/api";
import { AdminCrud, type AdminCrudProps, type AdminField } from "@/components/admin/AdminCrud";
import { categoryName, serviceLogo } from "@/lib/localize";
import { toast } from "sonner";
import { Link2, Link2Off, Power } from "lucide-react";
import { MAX_SERVICE_LOGOS, type CategoryRecord, type ServiceRecord } from "@/lib/types";

// Typed alias: JSX generic arguments are not supported by the build pipeline.
const ServiceCrud = AdminCrud as (props: AdminCrudProps<ServiceRecord>) => React.JSX.Element;

/**
 * The single place where an AI service is managed.
 *
 * The former standalone "Partner Offers" section is gone: the affiliate link,
 * the official URL and the status switches all live on this card now. The form
 * is intentionally short — the API writes only the submitted fields, so the
 * long-form catalog copy (features, pros/cons, tags…) keeps its stored value.
 */
export default function AdminServicesPage() {
  const { lang, t } = useLang();
  const f = t.admin.form;

  const fields: AdminField[] = [
    { key: "name", label: f.name, type: "text" },
    { key: "slug", label: f.slug, type: "text", hint: "/ai/slug" },
    { key: "category", label: f.category, type: "select", optionsSource: "categories" },
    { key: "affiliate_network", label: t.admin.affiliate.network, type: "text" },

    { key: "title_ru", label: `${f.title} RU`, type: "text" },
    { key: "title_uk", label: `${f.title} UK`, type: "text" },
    { key: "title_en", label: `${f.title} EN`, type: "text" },

    { key: "description_ru", label: `${f.description} RU`, type: "textarea", rows: 3 },
    { key: "description_uk", label: `${f.description} UK`, type: "textarea", rows: 3 },
    { key: "description_en", label: `${f.description} EN`, type: "textarea", rows: 3 },

    { key: "official_url", label: f.officialUrl, type: "url" },
    { key: "affiliate_url", label: f.affiliateUrl, type: "url", hint: "https://…" },
    {
      key: "affiliate_status",
      label: t.admin.affiliate.colStatus,
      type: "select",
      options: [
        { value: "not_connected", label: t.admin.affiliate.status.not_connected },
        { value: "pending", label: t.admin.affiliate.status.pending },
        { value: "connected", label: t.admin.affiliate.status.connected },
        { value: "rejected", label: t.admin.affiliate.status.rejected },
        { value: "not_available", label: t.admin.affiliate.status.not_available },
      ],
    },
    { key: "is_affiliate", label: f.isAffiliate, type: "toggle" },

    {
      key: "logo_files",
      label: t.uploads.logos,
      type: "files",
      max: MAX_SERVICE_LOGOS,
      hint: t.uploads.logosHint,
      full: true,
    },

    { key: "popular", label: f.popular, type: "toggle" },
    { key: "featured", label: f.featured, type: "toggle" },
    { key: "active", label: f.active, type: "toggle" },
  ];

  const empty: Record<string, any> = {
    name: "",
    slug: "",
    category: "",
    affiliate_network: "",
    title_ru: "",
    title_uk: "",
    title_en: "",
    description_ru: "",
    description_uk: "",
    description_en: "",
    official_url: "",
    affiliate_url: "",
    affiliate_status: "not_connected",
    is_affiliate: "no",
    logo_files: [],
    popular: "no",
    featured: "no",
    active: "yes",
  };

  /** Quick activate / deactivate — sends only the switch, nothing else changes. */
  const toggleActive = async (service: ServiceRecord, reload: () => void) => {
    const next = service.active === "yes" ? "no" : "yes";
    const response = await api.put(`/api/admin/services/${service._id}`, { active: next });
    if (!response.ok) {
      console.error("[admin] toggle active failed:", response.error);
      toast.error(String(response.error || t.common.error));
      return;
    }
    toast.success(next === "yes" ? f.activate : f.deactivate);
    reload();
  };

  return (
    <ServiceCrud
      endpoint="/api/admin/services"
      fields={fields}
      empty={empty}
      searchable
      newLabel={f.newService}
      editLabel={f.editService}
      renderActions={(service, reload) => (
        <button
          type="button"
          onClick={() => toggleActive(service, reload)}
          title={service.active === "yes" ? f.deactivate : f.activate}
          className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
            service.active === "yes"
              ? "bg-emerald-400/12 text-emerald-300 hover:bg-emerald-400/20"
              : "bg-white/6 text-foreground/45 hover:bg-white/12"
          }`}
        >
          <Power className="h-4 w-4" />
        </button>
      )}
      renderRow={(service) => {
        const category = (typeof service.category === "object" ? service.category : null) as CategoryRecord | null;
        const hasAffiliate = service.is_affiliate === "yes" && Boolean(service.affiliate_url);
        const logo = serviceLogo(service);
        return (
          <div className="flex min-w-0 items-center gap-3">
            {logo ? (
              <img
                src={logo}
                alt=""
                className="h-10 w-10 shrink-0 rounded-xl border border-white/10 bg-white/5 object-contain p-1.5"
              />
            ) : (
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/8 text-sm font-bold text-white">
                {service.name?.charAt(0)}
              </span>
            )}
            <div className="min-w-0">
              <p className="flex items-center gap-2 truncate text-sm font-semibold text-white">
                <span className="truncate">{service.name}</span>
                {service.featured === "yes" && <span className="text-xs">⭐</span>}
                {hasAffiliate ? (
                  <Link2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                ) : (
                  <Link2Off className="h-3.5 w-3.5 shrink-0 text-foreground/25" />
                )}
              </p>
              <p className="truncate text-xs text-foreground/45">
                /{service.slug}
                {category ? ` · ${categoryName(category, lang)}` : ""}
                {service.active === "no" ? ` · ${t.common.inactive}` : ""}
              </p>
            </div>
          </div>
        );
      }}
    />
  );
}
