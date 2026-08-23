"use client";

import { useLang } from "@/lib/i18n/context";
import { AdminCrud, type AdminCrudProps, type AdminField } from "@/components/admin/AdminCrud";
import { categoryName } from "@/lib/localize";
import type { CategoryRecord } from "@/lib/types";

// Typed alias: JSX generic arguments are not supported by the build pipeline.
const CategoryCrud = AdminCrud as (props: AdminCrudProps<CategoryRecord>) => React.JSX.Element;

export default function AdminCategoriesPage() {
  const { lang, t } = useLang();
  const f = t.admin.form;

  const fields: AdminField[] = [
    { key: "name_ru", label: `${f.name} RU`, type: "text" },
    { key: "name_uk", label: `${f.name} UK`, type: "text" },
    { key: "name_en", label: `${f.name} EN`, type: "text" },
    { key: "slug", label: f.slug, type: "text", hint: "/category/slug" },
    { key: "icon", label: f.icon, type: "text", placeholder: "🎬" },
    { key: "order_position", label: f.order, type: "number" },
    { key: "keywords", label: f.keywords, type: "text", full: true },
    { key: "active", label: f.active, type: "toggle" },
  ];

  return (
    <CategoryCrud
      endpoint="/api/admin/categories"
      fields={fields}
      empty={{ name_ru: "", name_uk: "", name_en: "", slug: "", icon: "", order_position: 99, keywords: "", active: "yes" }}
      newLabel={f.newCategory}
      editLabel={f.editCategory}
      renderRow={(category) => (
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/8 text-lg">
            {category.icon || "•"}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{categoryName(category, lang)}</p>
            <p className="truncate text-xs text-foreground/45">
              /{category.slug} · #{category.order_position ?? "—"}
              {category.active === "no" ? ` · ${t.common.inactive}` : ""}
            </p>
          </div>
        </div>
      )}
    />
  );
}
