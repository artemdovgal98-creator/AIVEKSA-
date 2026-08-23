import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerDict } from "@/lib/i18n/server";
import { getArticleBySlug, getArticles } from "@/lib/catalog";
import { ChevronLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) return { title: "404" };

  return {
    title: article.title,
    description: article.description,
    alternates: { canonical: `/guide/${article.slug}` },
    openGraph: {
      title: article.title,
      description: article.description,
      url: `/guide/${article.slug}`,
      type: "article",
      images: article.image_url ? [{ url: article.image_url }] : undefined,
      publishedTime: article.createdAt,
    },
    twitter: { card: "summary_large_image", title: article.title, description: article.description },
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { lang, t } = await getServerDict();
  const article = await getArticleBySlug(slug);

  if (!article || article.published === "no") notFound();

  const related = (await getArticles(article.language, 7)).filter((entry) => entry._id !== article._id).slice(0, 3);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    image: article.image_url || undefined,
    datePublished: article.createdAt,
    dateModified: article.updatedAt || article.createdAt,
    inLanguage: article.language || "ru",
    publisher: { "@type": "Organization", name: "AIVEXA" },
  };

  return (
    <article className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <Link
        href="/guide"
        className="mb-5 inline-flex items-center gap-1 text-sm font-medium text-foreground/55 transition-colors hover:text-white"
      >
        <ChevronLeft className="h-4 w-4" />
        {t.guide.back}
      </Link>

      <h1 className="font-display text-2xl font-extrabold leading-tight text-white sm:text-4xl">
        {article.title}
      </h1>
      {article.description && (
        <p className="mt-3 text-base text-foreground/65">{article.description}</p>
      )}
      <p className="mt-3 text-xs uppercase tracking-wide text-foreground/35">
        {formatDate(article.createdAt, lang)}
      </p>

      {article.image_url && (
        <img
          src={article.image_url}
          alt={article.title}
          className="mt-6 h-auto w-full rounded-3xl border border-white/8 object-cover"
        />
      )}

      {article.content && (
        <div className="mt-7 space-y-4">
          {article.content
            .split(/\n{2,}/)
            .map((block) => block.trim())
            .filter(Boolean)
            .map((block, index) =>
              block.startsWith("## ") ? (
                <h2 key={index} className="font-display pt-3 text-xl font-bold text-white">
                  {block.replace(/^##\s*/, "")}
                </h2>
              ) : block.startsWith("### ") ? (
                <h3 key={index} className="font-display pt-2 text-lg font-bold text-white">
                  {block.replace(/^###\s*/, "")}
                </h3>
              ) : (
                <p key={index} className="whitespace-pre-line text-[15px] leading-relaxed text-foreground/75">
                  {block}
                </p>
              )
            )}
        </div>
      )}

      {related.length > 0 && (
        <section className="mt-12 border-t border-white/8 pt-8">
          <h2 className="font-display mb-4 text-lg font-bold text-white">{t.guide.title}</h2>
          <div className="space-y-3">
            {related.map((entry) => (
              <Link
                key={entry._id}
                href={`/guide/${entry.slug}`}
                className="glass glass-hover block rounded-2xl p-4"
              >
                <p className="font-semibold text-white">{entry.title}</p>
                {entry.description && (
                  <p className="line-clamp-2 mt-1 text-sm text-foreground/55">{entry.description}</p>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}

function formatDate(value: string | undefined, lang: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const locale = lang === "en" ? "en-GB" : lang === "uk" ? "uk-UA" : "ru-RU";
  return date.toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" });
}
