import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerDict } from "@/lib/i18n/server";
import { getCategories, getCategoryBySlug } from "@/lib/catalog";
import { categoryName } from "@/lib/localize";
import { CatalogView } from "@/components/site/CatalogView";
import { AdBanner } from "@/components/site/AdBanner";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { lang, t } = await getServerDict();
  const category = await getCategoryBySlug(slug);
  if (!category) return { title: "404" };

  const name = categoryName(category, lang);
  const title = `${name} — AI`;
  const description = `${t.catalog.subtitle}: ${name}. ${t.seo.catalogDesc}`;

  return {
    title,
    description,
    alternates: { canonical: `/category/${category.slug}` },
    openGraph: { title: `${title} · AIVEXA`, description, url: `/category/${category.slug}` },
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { lang, t } = await getServerDict();

  const [category, categories] = await Promise.all([getCategoryBySlug(slug), getCategories()]);
  if (!category) notFound();

  const name = categoryName(category, lang);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6">
        <p className="text-sm text-foreground/45">
          <Link href="/catalog" className="hover:text-white">
            {t.catalog.title}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-foreground/70">{name}</span>
        </p>
        <h1 className="font-display mt-2 flex items-center gap-3 text-2xl font-extrabold text-white sm:text-4xl">
          <span aria-hidden>{category.icon}</span>
          {name}
        </h1>
      </header>

      <div className="no-scrollbar mb-6 flex gap-2 overflow-x-auto">
        {categories.map((entry) => (
          <Link
            key={entry._id}
            href={`/category/${entry.slug}`}
            className={`shrink-0 rounded-xl px-3 py-2 text-[13px] font-medium transition-all ${
              entry.slug === category.slug
                ? "bg-gradient-to-r from-[#4c6fff] to-[#a855f7] text-white"
                : "glass text-foreground/65 hover:text-white"
            }`}
          >
            {entry.icon} {categoryName(entry, lang)}
          </Link>
        ))}
      </div>

      <div className="mb-5">
        <AdBanner position="catalog" />
      </div>

      <CatalogView initialCategory={category.slug} lockedCategory />
    </div>
  );
}
