import type { Metadata } from "next";
import { getServerDict } from "@/lib/i18n/server";
import { ToolsView } from "@/components/site/ToolsView";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerDict();
  return {
    title: t.tools.title,
    description: t.tools.subtitle,
    alternates: { canonical: "/tools" },
    openGraph: { title: `${t.tools.title} · AIVEXA`, description: t.tools.subtitle, url: "/tools" },
  };
}

export default async function ToolsPage() {
  const { t } = await getServerDict();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <header className="mb-7">
        <h1 className="font-display text-2xl font-extrabold text-white sm:text-4xl">{t.tools.title}</h1>
        <p className="mt-2 text-sm text-foreground/60 sm:text-base">{t.tools.subtitle}</p>
      </header>

      <ToolsView />
    </div>
  );
}
