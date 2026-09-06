"use client";

import { useLang } from "@/lib/i18n/context";
import { AdminCrud, type AdminCrudProps, type AdminField } from "@/components/admin/AdminCrud";
import { fileUrl, type BannerRecord } from "@/lib/types";

// Typed alias: JSX generic arguments are not supported by the build pipeline.
const BannerCrud = AdminCrud as (props: AdminCrudProps<BannerRecord>) => React.JSX.Element;

export default function AdminBannersPage() {
  const { t } = useLang();
  const f = t.admin.form;

  const fields: AdminField[] = [
    { key: "title", label: f.title, type: "text" },
    {
      key: "position",
      label: f.position,
      type: "select",
      options: [
        { value: "home_top", label: "Home · top" },
        { value: "home_bottom", label: "Home · bottom" },
        { value: "catalog", label: "Catalog" },
        { value: "service_page", label: "Service page" },
      ],
    },
    { key: "banner_url", label: f.bannerUrl, type: "url", full: true },
    { key: "banner_file", label: t.uploads.banner, type: "files", max: 1, hint: t.uploads.bannerHint, full: true },
    { key: "banner_image", label: f.bannerImage, type: "url", full: true },
    { key: "order_position", label: f.order, type: "number" },
    { key: "active", label: f.active, type: "toggle" },
  ];

  return (
    <BannerCrud
      endpoint="/api/admin/banners"
      fields={fields}
      empty={{
        title: "",
        position: "home_top",
        banner_file: [],
        banner_image: "",
        banner_url: "",
        order_position: 0,
        active: "no",
      }}
      newLabel={f.newBanner}
      editLabel={f.editBanner}
      renderRow={(banner) => {
        const image = fileUrl(banner.banner_file) || banner.banner_image || "";
        return (
          <div className="flex min-w-0 items-center gap-3">
            {image ? (
              <img src={image} alt="" className="h-10 w-20 shrink-0 rounded-lg object-cover" />
            ) : (
              <span className="h-10 w-20 shrink-0 rounded-lg bg-white/8" />
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{banner.title || "—"}</p>
              <p className="truncate text-xs text-foreground/45">
                {banner.position} · {banner.active === "yes" ? t.common.active : t.common.inactive}
              </p>
            </div>
          </div>
        );
      }}
    />
  );
}
