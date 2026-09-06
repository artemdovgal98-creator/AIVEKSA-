"use client";

import Link from "next/link";
import { useLang } from "@/lib/i18n/context";
import { categoryName, expandedCategory, isAffiliatePartner, pickLocalized, serviceLogo, serviceTitle, toTags } from "@/lib/localize";
import { FavoriteButton } from "./FavoriteButton";
import { Star, ExternalLink, Flame, BadgeCheck } from "lucide-react";
import type { ServiceRecord } from "@/lib/types";

export function ServiceLogo({ service, className = "" }: { service: ServiceRecord; className?: string }) {
  const initial = (service.name || "?").charAt(0).toUpperCase();
  // An uploaded logo always wins over the default brand icon.
  const logo = serviceLogo(service);
  return (
    <span
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/12 bg-white/8 ${className}`}
    >
      {logo ? (
        <img
          src={logo}
          alt={service.name}
          loading="lazy"
          className="h-2/3 w-2/3 object-contain"
          onError={(event) => {
            (event.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      ) : null}
      <span className="pointer-events-none absolute font-display text-sm font-bold text-white/70 mix-blend-luminosity">
        {logo ? "" : initial}
      </span>
    </span>
  );
}

export function ServiceCard({ service, score, delay = 0 }: { service: ServiceRecord; score?: number; delay?: number }) {
  const { lang, t } = useLang();
  const category = expandedCategory(service);
  const heading = serviceTitle(service, lang);
  const description = pickLocalized(service, "description", lang);
  const tags = toTags(service.tags).slice(0, 3);
  // Only shown once the owner really connected an affiliate link — internal
  // affiliate bookkeeping is never exposed to visitors.
  const partner = isAffiliatePartner(service);

  return (
    <article
      className="glass glass-hover animate-fade-up group relative flex h-full min-w-0 flex-col overflow-hidden rounded-2xl p-4 sm:p-5"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start gap-3">
        <ServiceLogo service={service} className="h-12 w-12" />

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <h3 className="font-display min-w-0 truncate text-[15px] font-bold text-white sm:text-base">{heading}</h3>
            {service.popular === "yes" && (
              <Flame className="h-3.5 w-3.5 shrink-0 text-orange-400" aria-hidden />
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
            {category && (
              <Link
                href={`/category/${category.slug}`}
                className="rounded-full bg-white/8 px-2 py-0.5 text-foreground/70 transition-colors hover:bg-white/14 hover:text-white"
              >
                {category.icon} {categoryName(category, lang)}
              </Link>
            )}
            {typeof service.rating === "number" && service.rating > 0 && (
              <span className="flex items-center gap-0.5 rounded-full bg-amber-300/12 px-2 py-0.5 font-semibold text-amber-300">
                <Star className="h-3 w-3" fill="currentColor" />
                {service.rating.toFixed(1)}
              </span>
            )}
            {partner && (
              <span className="flex items-center gap-0.5 rounded-full bg-[color:var(--neon-violet)]/16 px-2 py-0.5 font-semibold text-[#d8b4fe]">
                <BadgeCheck className="h-3 w-3" />
                {t.admin.affiliate.partner}
              </span>
            )}
            {typeof score === "number" && (
              <span className="rounded-full bg-[color:var(--neon-cyan)]/15 px-2 py-0.5 font-semibold text-[color:var(--neon-cyan)]">
                {t.match.matchScore} {score}%
              </span>
            )}
          </div>
        </div>

        <FavoriteButton service={service} size="sm" />
      </div>

      <p className="mt-3 line-clamp-3 break-anywhere text-[13px] leading-relaxed text-foreground/65">{description}</p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {service.free_plan === "yes" ? (
          <span className="rounded-md bg-emerald-400/12 px-2 py-1 text-[11px] font-semibold text-emerald-300">
            {service.pricing_type === "free" ? t.card.free : t.card.freemium}
          </span>
        ) : (
          <span className="rounded-md bg-orange-400/12 px-2 py-1 text-[11px] font-semibold text-orange-300">
            {t.card.paid}
          </span>
        )}
        {service.pricing && (
          <span className="rounded-md bg-white/6 px-2 py-1 text-[11px] font-medium text-foreground/65">
            {service.pricing}
          </span>
        )}
        {tags.map((tag) => (
          <span
            key={tag}
            className="max-w-full truncate rounded-md bg-white/6 px-2 py-1 text-[11px] text-foreground/55"
          >
            #{tag}
          </span>
        ))}
      </div>

      <div className="mt-4 flex min-w-0 flex-wrap items-center gap-2 pt-1">
        <Link
          href={`/ai/${service.slug}`}
          className="min-w-0 flex-1 basis-[45%] truncate rounded-xl border border-white/12 bg-white/5 px-3 py-2.5 text-center text-[13px] font-semibold text-foreground/85 transition-colors hover:bg-white/10 hover:text-white"
        >
          {t.card.details}
        </Link>
        <a
          href={`/go/${service.slug}`}
          target="_blank"
          rel="nofollow sponsored noopener noreferrer"
          className="flex min-w-0 flex-1 basis-[45%] items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#4c6fff] to-[#a855f7] px-3 py-2.5 text-[13px] font-semibold text-white transition-all hover:shadow-[0_10px_30px_-12px_rgba(124,145,255,1)]"
        >
          <span className="truncate">{t.card.try}</span>
          <ExternalLink className="h-3.5 w-3.5 shrink-0" />
        </a>
      </div>
    </article>
  );
}
