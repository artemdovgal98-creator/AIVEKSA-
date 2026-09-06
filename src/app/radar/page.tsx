import type { Metadata } from "next";
import { getServerDict } from "@/lib/i18n/server";
import { getRadarItems } from "@/lib/catalog";
import { RadarFeed } from "@/components/site/RadarFeed";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerDict();
  return {
    title: t.radar.title,
    description: t.radar.subtitle,
    alternates: { canonical: "/radar" },
    openGraph: { title: `${t.radar.title} · AIVEXA`, description: t.radar.subtitle, url: "/radar" },
  };
}

export default async function RadarPage() {
  const { t } = await getServerDict();
  const items = await getRadarItems({ limit: 60 });
  console.log("[radar] rendering", items.length, "entries");

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <header className="mb-7">
        <h1 className="font-display text-2xl font-extrabold text-white sm:text-4xl">📡 {t.radar.title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-foreground/60 sm:text-base">{t.radar.subtitle}</p>
      </header>

      <RadarFeed items={items} />
    </div>
  );
}
