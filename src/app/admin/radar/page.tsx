"use client";

import { useLang } from "@/lib/i18n/context";
import { AdminCrud, type AdminCrudProps, type AdminField } from "@/components/admin/AdminCrud";
import { radarImage, radarTitle } from "@/lib/localize";
import { RADAR_IMPORTANCES, RADAR_TYPES, type RadarRecord } from "@/lib/types";

// Typed alias: JSX generic arguments are not supported by the build pipeline.
const RadarCrud = AdminCrud as (props: AdminCrudProps<RadarRecord>) => React.JSX.Element;

export default function AdminRadarPage() {
  const { lang, t } = useLang();
  const f = t.radar.form;

  const fields: AdminField[] = [
    { key: "title_ru", label: `${f.titleField} RU`, type: "text" },
    { key: "title_uk", label: `${f.titleField} UK`, type: "text" },
    { key: "title_en", label: `${f.titleField} EN`, type: "text" },
    {
      key: "radar_type",
      label: f.type,
      type: "select",
      options: RADAR_TYPES.map((value) => ({ value, label: t.radar.types[value] })),
    },
    {
      key: "importance",
      label: f.importanceField,
      type: "select",
      options: RADAR_IMPORTANCES.map((value) => ({ value, label: t.radar.importance[value] })),
    },
    { key: "summary_ru", label: `${f.summary} RU`, type: "textarea", rows: 3 },
    { key: "summary_uk", label: `${f.summary} UK`, type: "textarea", rows: 3 },
    { key: "summary_en", label: `${f.summary} EN`, type: "textarea", rows: 3 },
    { key: "source_name", label: f.sourceName, type: "text" },
    { key: "source_url", label: f.sourceUrl, type: "url" },
    { key: "published_at", label: f.publishedAt, type: "date" },
    { key: "order_position", label: t.admin.form.order, type: "number" },
    { key: "category", label: t.admin.form.category, type: "select", optionsSource: "categories" },
    { key: "service", label: f.relatedService, type: "select", optionsSource: "services" },
    { key: "image_url", label: t.admin.form.image, type: "url", full: true },
    { key: "cover", label: t.uploads.cover, type: "files", max: 1, hint: t.uploads.coverHint, full: true },
    { key: "pinned", label: f.pinnedField, type: "toggle" },
    { key: "active", label: t.admin.form.active, type: "toggle" },
  ];

  const empty: Record<string, any> = {
    title_ru: "",
    title_uk: "",
    title_en: "",
    summary_ru: "",
    summary_uk: "",
    summary_en: "",
    radar_type: "update",
    importance: "normal",
    source_name: "",
    source_url: "",
    published_at: new Date().toISOString().slice(0, 10),
    order_position: 0,
    category: "",
    service: "",
    image_url: "",
    cover: [],
    pinned: "no",
    active: "yes",
  };

  return (
    <RadarCrud
      endpoint="/api/admin/radar"
      fields={fields}
      empty={empty}
      searchable
      newLabel={f.newItem}
      editLabel={f.editItem}
      renderRow={(item) => {
        const image = radarImage(item);
        return (
          <div className="flex min-w-0 items-center gap-3">
            {image ? (
              <img src={image} alt="" className="h-10 w-14 shrink-0 rounded-lg object-cover" />
            ) : (
              <span className="h-10 w-14 shrink-0 rounded-lg bg-white/8" />
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">
                {radarTitle(item, lang) || "—"}
                {item.pinned === "yes" ? " 📌" : ""}
              </p>
              <p className="truncate text-xs text-foreground/45">
                {t.radar.types[item.radar_type || "update"]} · {t.radar.importance[item.importance || "normal"]}
                {item.active === "no" ? ` · ${t.common.inactive}` : ""}
              </p>
            </div>
          </div>
        );
      }}
    />
  );
}
