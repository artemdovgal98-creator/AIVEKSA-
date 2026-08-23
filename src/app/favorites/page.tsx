import type { Metadata } from "next";
import { getServerDict } from "@/lib/i18n/server";
import { FavoritesView } from "@/components/site/FavoritesView";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerDict();
  return {
    title: t.favorites.title,
    description: t.favorites.subtitle,
    alternates: { canonical: "/favorites" },
    robots: { index: false, follow: true },
  };
}

export default async function FavoritesPage() {
  const { t } = await getServerDict();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <header className="mb-6">
        <h1 className="font-display text-2xl font-extrabold text-white sm:text-4xl">
          ⭐ {t.favorites.title}
        </h1>
        <p className="mt-2 text-sm text-foreground/60 sm:text-base">{t.favorites.subtitle}</p>
      </header>

      <FavoritesView />
    </div>
  );
}
