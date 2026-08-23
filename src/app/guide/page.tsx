import type { Metadata } from "next";
import Link from "next/link";
import { getServerDict } from "@/lib/i18n/server";
import { getArticles } from "@/lib/catalog";
import { CalendarDays } from "lucide-react";

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

  // Prefer articles in the active language; fall back to the whole list when empty.
  const localized = await getArticles(lang, 30);
  const articles = localized.length > 0 ? localized : await getArticles(undefined, 30);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <header className="mb-7">
        <h1 className="font-display text-2xl font-extrabold text-white sm:text-4xl">{t.guide.title}</h1>
        <p className="mt-2 text-sm text-foreground/60 sm:text-base">{t.guide.subtitle}</p>
      </header>

      {articles.length === 0 ? (
        <div className="glass rounded-3xl px-6 py-16 text-center text-sm text-foreground/55">
          {t.guide.empty}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((article, index) => (
            <Link
              key={article._id}
              href={`/guide/${article.slug}`}
              className="glass glass-hover animate-fade-up group flex flex-col overflow-hidden rounded-2xl"
              style={{ animationDelay: `${Math.min(index, 9) * 40}ms` }}
            >
              {article.image_url && (
                <span className="relative block h-44 overflow-hidden">
                  <img
                    src={article.image_url}
                    alt={article.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <span className="absolute inset-0 bg-gradient-to-t from-[#0b0b16] via-transparent to-transparent" />
                </span>
              )}
              <span className="flex flex-1 flex-col p-5">
                <span className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-foreground/40">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {formatDate(article.createdAt, lang)}
                  <span className="rounded bg-white/8 px-1.5 py-0.5 text-[10px] font-bold text-foreground/60">
                    {(article.language || "ru").toUpperCase()}
                  </span>
                </span>
                <span className="font-display mt-2 block text-base font-bold leading-snug text-white">
                  {article.title}
                </span>
                {article.description && (
                  <span className="line-clamp-3 mt-2 block text-sm text-foreground/55">
                    {article.description}
                  </span>
                )}
                <span className="mt-4 block text-sm font-semibold text-[color:var(--neon-cyan)]">
                  {t.guide.readMore} →
                </span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function formatDate(value: string | undefined, lang: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const locale = lang === "en" ? "en-GB" : lang === "uk" ? "uk-UA" : "ru-RU";
  return date.toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" });
}
