import type { Metadata } from "next";
import { getServerDict } from "@/lib/i18n/server";
import { getArticles } from "@/lib/catalog";
import { GuideView } from "@/components/site/GuideView";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerDict();
  return {
    title: t.guide.title,
    description: t.guide.subtitle,
    alternates: { canonical: "/guide" },
    openGraph: { title: `${t.guide.title} · AIVEXA`, description: t.guide.subtitle, url: "/guide" },
  };
}

export default async function GuidePage() {
  const { lang, t } = await getServerDict();

  // Prefer articles in the active language; fall back to the whole library
  // when nothing is translated yet. The list is built to grow — 200 entries.
  const localized = await getArticles(lang, 200);
  const articles = localized.length > 0 ? localized : await getArticles(undefined, 200);
  console.log("[guide] rendering", articles.length, "articles for", lang);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <header className="mb-7">
        <h1 className="font-display text-2xl font-extrabold text-white sm:text-4xl">{t.guide.title}</h1>
        <p className="mt-2 text-sm text-foreground/60 sm:text-base">{t.guide.subtitle}</p>
      </header>

      <GuideView articles={articles} />
    </div>
  );
}
