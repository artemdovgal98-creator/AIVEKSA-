import type { Metadata } from "next";
import { getServerDict } from "@/lib/i18n/server";
import { MatchView } from "@/components/site/MatchView";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerDict();
  return {
    title: t.match.title,
    description: t.match.subtitle,
    alternates: { canonical: "/match" },
    openGraph: { title: `${t.match.title} · AIVEXA`, description: t.match.subtitle, url: "/match" },
  };
}

export default async function MatchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const { t } = await getServerDict();
  const task = (Array.isArray(params.task) ? params.task[0] : params.task) || "";

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-7 text-center">
        <h1 className="font-display text-2xl font-extrabold text-white sm:text-4xl">
          {t.match.title}
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-foreground/60 sm:text-base">
          {t.match.subtitle}
        </p>
      </header>

      <MatchView initialTask={task} />
    </div>
  );
}
