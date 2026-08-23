import type { Metadata } from "next";
import { getServerDict } from "@/lib/i18n/server";
import { CatalogView } from "@/components/site/CatalogView";
import { AdBanner } from "@/components/site/AdBanner";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerDict();
  return {
    title: t.seo.catalogTitle,
    description: t.seo.catalogDesc,
    alternates: { canonical: "/catalog" },
    openGraph: { title: t.seo.catalogTitle, description: t.seo.catalogDesc, url: "/catalog" },
  };
}

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const { t } = await getServerDict();

  const single = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) || "";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6">
        <h1 className="font-display text-2xl font-extrabold text-white sm:text-4xl">{t.catalog.title}</h1>
        <p className="mt-2 text-sm text-foreground/60 sm:text-base">{t.catalog.subtitle}</p>
      </header>

      <div className="mb-5">
        <AdBanner position="catalog" />
      </div>

      <CatalogView
        initialQuery={single(params.q)}
        initialCategory={single(params.category)}
        initialFilter={single(params.filter) || "all"}
        initialSort={single(params.sort) || "popular"}
      />
    </div>
  );
}
