import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerDict } from "@/lib/i18n/server";
import { getServiceBySlug, getSimilarServices, incrementServiceViews } from "@/lib/catalog";
import {
  categoryName,
  expandedCategory,
  isAffiliatePartner,
  pickLocalized,
  resolveTargetUrl,
  serviceLogo,
  serviceTitle,
  toList,
  toTags,
} from "@/lib/localize";
import { ServiceCard, ServiceLogo } from "@/components/site/ServiceCard";
import { FavoriteButton } from "@/components/site/FavoriteButton";
import { AdBanner } from "@/components/site/AdBanner";
import { SectionHeading } from "@/components/site/SectionHeading";
import { BadgeCheck, Check, ChevronLeft, Minus, Sparkles, Star, Tag } from "lucide-react";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { lang } = await getServerDict();
  const service = await getServiceBySlug(slug);
  if (!service) return { title: "404" };

  const description = pickLocalized(service, "description", lang);
  const heading = serviceTitle(service, lang);
  const title = `${heading} — ${categoryName(expandedCategory(service), lang)}`;
  const cover = serviceLogo(service);

  return {
    title,
    description,
    alternates: { canonical: `/ai/${service.slug}` },
    openGraph: {
      title: `${heading} · AIVEXA`,
      description,
      url: `/ai/${service.slug}`,
      images: cover ? [{ url: cover }] : undefined,
      type: "article",
    },
    twitter: { card: "summary", title: `${heading} · AIVEXA`, description },
  };
}

export default async function ServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { lang, t } = await getServerDict();
  const service = await getServiceBySlug(slug);

  if (!service || service.active === "no") notFound();

  // Real page view counter — used by the admin dashboard (no invented numbers).
  await incrementServiceViews(service._id, service.views);

  const similar = await getSimilarServices(service, 4);
  const category = expandedCategory(service);
  const description = pickLocalized(service, "description", lang);
  const features = toList(pickLocalized(service, "features", lang));
  const pros = toList(pickLocalized(service, "pros", lang));
  const cons = toList(pickLocalized(service, "cons", lang));
  const tags = toTags(service.tags);
  const target = resolveTargetUrl(service);
  const partner = isAffiliatePartner(service);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: service.name,
    description,
    applicationCategory: categoryName(category, lang),
    operatingSystem: "Web",
    url: `/ai/${service.slug}`,
    image: serviceLogo(service) || undefined,
    offers: {
      "@type": "Offer",
      price: service.pricing_type === "free" ? "0" : undefined,
      priceCurrency: "USD",
      description: service.pricing || undefined,
    },
    aggregateRating:
      service.rating && service.rating > 0
        ? { "@type": "AggregateRating", ratingValue: service.rating, bestRating: 5, ratingCount: 1 }
        : undefined,
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Link
        href="/catalog"
        className="mb-5 inline-flex items-center gap-1 text-sm font-medium text-foreground/55 transition-colors hover:text-white"
      >
        <ChevronLeft className="h-4 w-4" />
        {t.service.backToCatalog}
      </Link>

      {/* Header card */}
      <section className="glass-strong animate-fade-up relative overflow-hidden rounded-3xl p-5 sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[color:var(--neon-violet)]/18 blur-3xl" />

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start">
          <ServiceLogo service={service} className="h-16 w-16 sm:h-20 sm:w-20" />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {category && (
                <Link
                  href={`/category/${category.slug}`}
                  className="glass glass-hover rounded-full px-3 py-1 text-xs font-semibold text-foreground/75"
                >
                  {category.icon} {categoryName(category, lang)}
                </Link>
              )}
              {service.featured === "yes" && (
                <span className="rounded-full bg-gradient-to-r from-[#4c6fff] to-[#a855f7] px-3 py-1 text-xs font-bold text-white">
                  ⭐ {t.home.featured}
                </span>
              )}
              {service.free_plan === "yes" && (
                <span className="rounded-full bg-emerald-400/14 px-3 py-1 text-xs font-semibold text-emerald-300">
                  {t.card.freemium}
                </span>
              )}
              {partner && (
                <span className="flex items-center gap-1 rounded-full bg-[color:var(--neon-violet)]/16 px-3 py-1 text-xs font-semibold text-[#d8b4fe]">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  {t.admin.affiliate.partner}
                </span>
              )}
            </div>

            <h1 className="font-display mt-3 break-anywhere text-2xl font-extrabold text-white sm:text-4xl">
              {serviceTitle(service, lang)}
            </h1>
            <p className="mt-2 max-w-2xl break-anywhere text-sm leading-relaxed text-foreground/70 sm:text-base">
              {description}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
              {typeof service.rating === "number" && service.rating > 0 && (
                <span className="flex items-center gap-1.5 font-semibold text-amber-300">
                  <Star className="h-4 w-4 fill-amber-300" />
                  {service.rating.toFixed(1)}
                  <span className="font-normal text-foreground/45">/ 5</span>
                </span>
              )}
              {service.pricing && (
                <span className="text-foreground/60">
                  <span className="text-foreground/40">{t.service.pricing}: </span>
                  {service.pricing}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="relative mt-6 flex flex-wrap items-center gap-3">
          <a
            href={`/go/${service.slug}`}
            target="_blank"
            rel="nofollow sponsored noopener noreferrer"
            className="glow-primary flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#4c6fff] via-[#7c5cff] to-[#a855f7] px-6 py-4 text-base font-bold text-white transition-transform active:scale-[0.98] sm:flex-none sm:px-10"
          >
            {t.service.tryNow}
          </a>
          <FavoriteButton service={service} />
        </div>

        {partner && (
          <p className="relative mt-3 text-xs text-foreground/40">{t.service.affiliateNote}</p>
        )}
        {/* target is resolved server-side; /go/[slug] records the click and redirects there */}
        <link rel="preconnect" href={safeOrigin(target)} />
      </section>

      {/* Details */}
      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {features.length > 0 && (
            <section className="glass animate-fade-up rounded-2xl p-5 sm:p-6">
              <h2 className="font-display mb-4 flex items-center gap-2 text-lg font-bold text-white">
                <Sparkles className="h-4.5 w-4.5 text-[color:var(--neon-cyan)]" />
                {t.service.features}
              </h2>
              <ul className="grid gap-2.5 sm:grid-cols-2">
                {features.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-foreground/75">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--neon-cyan)]" />
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {(pros.length > 0 || cons.length > 0) && (
            <div className="grid gap-4 sm:grid-cols-2">
              {pros.length > 0 && (
                <section className="glass animate-fade-up rounded-2xl p-5">
                  <h2 className="font-display mb-3 text-base font-bold text-emerald-300">
                    {t.service.pros}
                  </h2>
                  <ul className="space-y-2">
                    {pros.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm text-foreground/75">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {cons.length > 0 && (
                <section className="glass animate-fade-up rounded-2xl p-5">
                  <h2 className="font-display mb-3 text-base font-bold text-rose-300">{t.service.cons}</h2>
                  <ul className="space-y-2">
                    {cons.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm text-foreground/75">
                        <Minus className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}

          <AdBanner position="service_page" />
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          <section className="glass animate-fade-up rounded-2xl p-5">
            <h2 className="font-display mb-4 text-base font-bold text-white">{t.service.pricing}</h2>
            <dl className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-foreground/50">{t.service.freePlan}</dt>
                <dd className={service.free_plan === "yes" ? "font-semibold text-emerald-300" : "text-foreground/70"}>
                  {service.free_plan === "yes" ? t.service.yes : t.service.no}
                </dd>
              </div>
              {service.pricing && (
                <div className="flex items-start justify-between gap-3">
                  <dt className="shrink-0 text-foreground/50">{t.card.paid}</dt>
                  <dd className="text-right font-medium text-foreground/85">{service.pricing}</dd>
                </div>
              )}
              {category && (
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-foreground/50">{t.service.category}</dt>
                  <dd>
                    <Link href={`/category/${category.slug}`} className="font-medium text-white hover:underline">
                      {categoryName(category, lang)}
                    </Link>
                  </dd>
                </div>
              )}
            </dl>
          </section>

          {tags.length > 0 && (
            <section className="glass animate-fade-up rounded-2xl p-5">
              <h2 className="font-display mb-3 flex items-center gap-2 text-base font-bold text-white">
                <Tag className="h-4 w-4 text-[color:var(--neon-violet)]" />
                {t.service.tags}
              </h2>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Link
                    key={tag}
                    href={`/catalog?q=${encodeURIComponent(tag)}`}
                    className="rounded-lg bg-white/6 px-2.5 py-1 text-xs text-foreground/70 transition-colors hover:bg-white/12 hover:text-white"
                  >
                    #{tag}
                  </Link>
                ))}
              </div>
            </section>
          )}
        </aside>
      </div>

      {similar.length > 0 && (
        <section className="mt-10">
          <SectionHeading title={t.service.similar} />
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {similar.map((item, index) => (
              <ServiceCard key={item._id} service={item} delay={index * 40} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/** Safe origin for preconnect — returns the site origin when the URL is unusable. */
function safeOrigin(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return "/";
  }
}
