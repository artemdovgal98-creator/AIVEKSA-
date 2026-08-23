"use client";

import { useLang } from "@/lib/i18n/context";
import { api } from "@/lib/api";
import { AdminCrud, type AdminCrudProps, type AdminField } from "@/components/admin/AdminCrud";
import { categoryName } from "@/lib/localize";
import { toast } from "sonner";
import { Link2, Link2Off, Power } from "lucide-react";
import type { CategoryRecord, ServiceRecord } from "@/lib/types";

// Typed alias: JSX generic arguments are not supported by the build pipeline.
const ServiceCrud = AdminCrud as (props: AdminCrudProps<ServiceRecord>) => React.JSX.Element;

export default function AdminServicesPage() {
  const { lang, t } = useLang();
  const f = t.admin.form;

  const fields: AdminField[] = [
    { key: "name", label: f.name, type: "text" },
    { key: "slug", label: f.slug, type: "text", hint: "/ai/slug" },
    { key: "category", label: f.category, type: "select", optionsSource: "categories" },
    { key: "logo_url", label: f.logo, type: "url" },
    { key: "official_url", label: f.officialUrl, type: "url" },
    { key: "affiliate_url", label: f.affiliateUrl, type: "url", hint: "https://…" },
    { key: "is_affiliate", label: f.isAffiliate, type: "toggle" },
    { key: "free_plan", label: f.freePlan, type: "toggle" },
    {
      key: "pricing_type",
      label: f.pricingType,
      type: "select",
      options: [
        { value: "free", label: t.card.free },
        { value: "freemium", label: t.card.freemium },
        { value: "paid", label: t.card.paid },
      ],
    },
    { key: "pricing", label: f.pricing, type: "text" },
    { key: "rating", label: f.rating, type: "number", step: "0.1" },
    { key: "popularity", label: f.popularity, type: "number" },
    { key: "tags", label: f.tags, type: "text", full: true },
    { key: "keywords", label: f.keywords, type: "text", full: true },
    { key: "description_ru", label: `${f.description} RU`, type: "textarea", rows: 3 },
    { key: "description_uk", label: `${f.description} UK`, type: "textarea", rows: 3 },
    { key: "description_en", label: `${f.description} EN`, type: "textarea", rows: 3 },
    { key: "features_ru", label: `${f.features} RU`, type: "textarea", rows: 4 },
    { key: "features_uk", label: `${f.features} UK`, type: "textarea", rows: 4 },
    { key: "features_en", label: `${f.features} EN`, type: "textarea", rows: 4 },
    { key: "pros_ru", label: `${f.pros} RU`, type: "textarea", rows: 3 },
    { key: "pros_uk", label: `${f.pros} UK`, type: "textarea", rows: 3 },
    { key: "pros_en", label: `${f.pros} EN`, type: "textarea", rows: 3 },
    { key: "cons_ru", label: `${f.cons} RU`, type: "textarea", rows: 3 },
    { key: "cons_uk", label: `${f.cons} UK`, type: "textarea", rows: 3 },
    { key: "cons_en", label: `${f.cons} EN`, type: "textarea", rows: 3 },
    { key: "popular", label: f.popular, type: "toggle" },
    { key: "featured", label: f.featured, type: "toggle" },
    { key: "active", label: f.active, type: "toggle" },
  ];

  const empty: Record<string, any> = {
    name: "",
    slug: "",
    category: "",
    logo_url: "",
    official_url: "",
    affiliate_url: "",
    is_affiliate: "no",
    free_plan: "no",
    pricing_type: "freemium",
    pricing: "",
    rating: 0,
    popularity: 0,
    tags: "",
    keywords: "",
    description_ru: "",
    description_uk: "",
    description_en: "",
    features_ru: "",
    features_uk: "",
    features_en: "",
    pros_ru: "",
    pros_uk: "",
    pros_en: "",
    cons_ru: "",
    cons_uk: "",
    cons_en: "",
    popular: "no",
    featured: "no",
    active: "yes",
  };

  /** Quick activate / deactivate without opening the full form. */
  const toggleActive = async (service: ServiceRecord, reload: () => void) => {
    const next = service.active === "yes" ? "no" : "yes";
    const category = service.category;
    const payload = {
      ...service,
      category: category && typeof category === "object" ? category._id : category,
      active: next,
    };
    const response = await api.put(`/api/admin/services/${service._id}`, payload);
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
        return (
          <div className="flex min-w-0 items-center gap-3">
            {service.logo_url ? (
              <img
                src={service.logo_url}
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
                {service.name}
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
