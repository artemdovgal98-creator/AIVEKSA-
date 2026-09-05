import Link from "next/link";
import { getServerDict } from "@/lib/i18n/server";
import { getCategories, getServices } from "@/lib/catalog";
import { categoryName } from "@/lib/localize";
import { ServiceCard } from "@/components/site/ServiceCard";
import { SearchBox } from "@/components/site/SearchBox";
import { HeroExamples } from "@/components/site/HeroExamples";
import { SectionHeading } from "@/components/site/SectionHeading";
import { AdBanner } from "@/components/site/AdBanner";
import { Wand2, Wrench, Sparkles, Send, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export default async function Home() {
  const { lang, t } = await getServerDict();

  const [categories, featured, popular, newest, affiliatePicks, allServices] = await Promise.all([
    getCategories(),
    getServices({ filter: "featured", sort: "rating", limit: 6 }),
    getServices({ filter: "popular", sort: "popular", limit: 8 }),
    getServices({ sort: "new", limit: 4 }),
    // 💰 Affiliate Picks — rendered only when the owner actually connected links.
    getServices({ filter: "affiliate", sort: "rating", limit: 6 }),
    getServices({ limit: 1 }),
  ]);

  const freeCount = await getServices({ filter: "has_free", limit: 1 });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "AIVEXA",
    url: appUrl,
    description: t.seo.homeDesc,
    potentialAction: {
      "@type": "SearchAction",
      target: `${appUrl}/catalog?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <div className="relative">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* ---------------- HERO ---------------- */}
      <section className="relative overflow-hidden">
        <div className="grid-overlay pointer-events-none absolute inset-0 h-[520px]" aria-hidden />
        <div
          className="animate-float pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-[#4c6fff]/25 blur-[110px]"
          aria-hidden
        />

        <div className="relative mx-auto max-w-4xl px-4 pt-12 pb-10 text-center sm:px-6 sm:pt-20 lg:px-8">
          <div className="animate-fade-up glass mx-auto mb-6 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[11px] font-medium text-foreground/75 sm:text-xs">
            <Sparkles className="h-3.5 w-3.5 text-[color:var(--neon-cyan)]" />
            {t.home.badge}
          </div>

          <h1
            className="animate-fade-up font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl"
            style={{ animationDelay: "60ms" }}
          >
            AI<span className="neon-text">VEXA</span>
          </h1>

          <p
            className="animate-fade-up font-display mt-4 text-xl font-bold text-white sm:text-3xl"
            style={{ animationDelay: "120ms" }}
          >
            {t.home.tagline}
          </p>

          <p
            className="animate-fade-up mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-foreground/65 sm:text-base"
            style={{ animationDelay: "180ms" }}
          >
            {t.home.subtitle}
          </p>

          <div className="animate-fade-up mt-8" style={{ animationDelay: "240ms" }}>
            <SearchBox size="lg" />
            <HeroExamples />
          </div>

          <dl
            className="animate-fade-up mt-9 grid grid-cols-3 gap-2 sm:gap-4"
            style={{ animationDelay: "300ms" }}
          >
            {[
              { value: allServices.total, label: t.home.statsServices },
              { value: categories.length, label: t.home.statsCategories },
              { value: freeCount.total, label: t.home.statsFree },
            ].map((stat) => (
              <div key={stat.label} className="glass rounded-2xl px-2 py-4">
                <dt className="font-display text-2xl font-extrabold text-white sm:text-3xl">{stat.value}</dt>
                <dd className="mt-1 text-[11px] leading-tight text-foreground/55 sm:text-xs">{stat.label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-14 px-4 pb-16 sm:px-6 lg:px-8">
        {/* ---------------- CATEGORIES ---------------- */}
        <section>
          <SectionHeading title={t.home.quickCategories} accent="cyan" />
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
            {categories.map((category, index) => (
              <Link
                key={category._id}
                href={`/category/${category.slug}`}
                className="glass glass-hover animate-fade-up flex flex-col items-center gap-2 rounded-2xl px-2 py-5 text-center"
                style={{ animationDelay: `${index * 35}ms` }}
              >
                <span className="text-2xl">{category.icon}</span>
                <span className="text-xs font-semibold leading-tight text-foreground/85 sm:text-[13px]">
                  {categoryName(category, lang)}
                </span>
              </Link>
            ))}
          </div>
        </section>

        <AdBanner position="home_top" />

        {/* ---------------- FEATURED ---------------- */}
        {featured.items.length > 0 && (
          <section>
            <SectionHeading
              title={`⭐ ${t.home.featured}`}
              subtitle={t.home.featuredSub}
              href="/catalog?filter=featured"
              linkLabel={t.home.viewAll}
              accent="violet"
            />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {featured.items.map((service, index) => (
                <ServiceCard key={service._id} service={service} delay={index * 40} />
              ))}
            </div>
          </section>
        )}

        {/* ---------------- AFFILIATE PICKS ---------------- */}
        {affiliatePicks.items.length > 0 && (
          <section>
            <SectionHeading
              title={`\u{1F4B0} ${t.home.affiliatePicks}`}
              subtitle={t.home.affiliatePicksSub}
              href="/catalog?filter=affiliate"
              linkLabel={t.home.viewAll}
              accent="cyan"
            />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {affiliatePicks.items.map((service, index) => (
                <ServiceCard key={service._id} service={service} delay={index * 40} />
              ))}
            </div>
          </section>
        )}

        {/* ---------------- CTA BLOCKS ---------------- */}
        <section className="grid gap-3 md:grid-cols-3">
          <Link
            href="/match"
            className="glass glass-hover neon-border group relative overflow-hidden rounded-2xl p-6"
          >
            <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[#4c6fff]/25 blur-3xl" />
            <Wand2 className="h-8 w-8 text-[color:var(--neon-blue)]" />
            <h3 className="font-display mt-4 text-lg font-bold text-white">{t.home.matchCta}</h3>
            <p className="mt-2 text-sm text-foreground/65">{t.home.matchCtaSub}</p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[color:var(--neon-cyan)]">
              {t.home.matchCtaBtn}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </Link>

          <Link
            href="/tools"
            className="glass glass-hover neon-border group relative overflow-hidden rounded-2xl p-6"
          >
            <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[#a855f7]/25 blur-3xl" />
            <Wrench className="h-8 w-8 text-[color:var(--neon-violet)]" />
            <h3 className="font-display mt-4 text-lg font-bold text-white">{t.home.toolsCta}</h3>
            <p className="mt-2 text-sm text-foreground/65">{t.home.toolsCtaSub}</p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[color:var(--neon-cyan)]">
              {t.home.toolsCtaBtn}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </Link>

          <Link
            href="/referrals"
            className="glass glass-hover neon-border group relative overflow-hidden rounded-2xl p-6"
          >
            <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[#229ED9]/30 blur-3xl" />
            <Send className="h-8 w-8 text-[#229ED9]" />
            <h3 className="font-display mt-4 text-lg font-bold text-white">{t.referralPage.title}</h3>
            <p className="mt-2 text-sm text-foreground/65">{t.referralPage.subtitle}</p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[color:var(--neon-cyan)]">
              {t.referralPage.openBot}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </Link>
        </section>

        {/* ---------------- POPULAR ---------------- */}
        {popular.items.length > 0 && (
          <section>
            <SectionHeading
              title={t.home.popular}
              subtitle={t.home.popularSub}
              href="/catalog?filter=popular"
              linkLabel={t.home.viewAll}
            />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {popular.items.map((service, index) => (
                <ServiceCard key={service._id} service={service} delay={index * 35} />
              ))}
            </div>
          </section>
        )}

        {/* ---------------- NEWEST ---------------- */}
        {newest.items.length > 0 && (
          <section>
            <SectionHeading
              title={t.home.newest}
              href="/catalog?sort=new"
              linkLabel={t.home.viewAll}
              accent="cyan"
            />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {newest.items.map((service, index) => (
                <ServiceCard key={service._id} service={service} delay={index * 35} />
              ))}
            </div>
          </section>
        )}

        <AdBanner position="home_bottom" />
      </div>
    </div>
  );
}
