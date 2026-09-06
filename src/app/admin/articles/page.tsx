"use client";

import { useLang } from "@/lib/i18n/context";
import { AdminCrud, type AdminCrudProps, type AdminField } from "@/components/admin/AdminCrud";
import { fileUrl, type ArticleRecord } from "@/lib/types";

// Typed alias: JSX generic arguments are not supported by the build pipeline.
const ArticleCrud = AdminCrud as (props: AdminCrudProps<ArticleRecord>) => React.JSX.Element;

export default function AdminArticlesPage() {
  const { t } = useLang();
  const f = t.admin.form;

  const fields: AdminField[] = [
    { key: "title", label: f.title, type: "text" },
    { key: "slug", label: f.slug, type: "text", hint: "/guide/slug" },
    { key: "language", label: f.language, type: "select", options: [
      { value: "ru", label: "🇷🇺 RU" },
      { value: "uk", label: "🇺🇦 UK" },
      { value: "en", label: "🇬🇧 EN" },
    ] },
    { key: "category", label: f.category, type: "select", optionsSource: "categories" },
    { key: "image_url", label: f.image, type: "url", full: true },
    { key: "cover", label: t.uploads.cover, type: "files", max: 1, hint: t.uploads.coverHint, full: true },
    { key: "description", label: f.description, type: "textarea", rows: 2 },
    { key: "content", label: f.content, type: "textarea", rows: 14 },
    { key: "published", label: f.published, type: "toggle" },
  ];

  return (
    <ArticleCrud
      endpoint="/api/admin/articles"
      fields={fields}
      empty={{
        title: "",
        slug: "",
        language: "ru",
        category: "",
        image_url: "",
        cover: [],
        description: "",
        content: "",
        published: "no",
      }}
      searchable
      newLabel={f.newArticle}
      editLabel={f.editArticle}
      renderRow={(article) => {
        const cover = fileUrl(article.cover) || article.image_url || "";
        return (
        <div className="flex min-w-0 items-center gap-3">
          {cover ? (
            <img src={cover} alt="" className="h-10 w-14 shrink-0 rounded-lg object-cover" />
          ) : (
            <span className="h-10 w-14 shrink-0 rounded-lg bg-white/8" />
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{article.title}</p>
            <p className="truncate text-xs text-foreground/45">
              /{article.slug} · {(article.language || "ru").toUpperCase()} ·{" "}
              {article.published === "yes" ? t.admin.form.published : t.common.inactive}
            </p>
          </div>
        </div>
        );
      }}
    />
  );
}
