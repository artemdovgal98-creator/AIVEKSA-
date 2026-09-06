import type { Metadata } from "next";
import Link from "next/link";
import { getServerDict } from "@/lib/i18n/server";
import { getPublicOffers, offerNetwork } from "@/lib/offers";
import { ArrowUpRight, Info, Tags } from "lucide-react";
import type { AffiliateOfferRecord, PayoutModel, ServiceRecord } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerDict();
  return {
    title: t.offersPage.title,
    description: t.offersPage.subtitle,
    alternates: { canonical: "/offers" },
    openGraph: { title: `${t.offersPage.title} · AIVEXA`, description: t.offersPage.subtitle, url: "/offers" },
  };
}

const DEFAULT_ACCENT = "#7c8cff";

/**
 * Public offer wall. Only offers the owner has actually saved an affiliate
 * link for are listed — every card links to /go/offer/<id>, which tracks the
 * click and forwards the visitor to that exact saved URL.
 */
export default async function OffersPage() {
  const { t } = await getServerDict();
  const offers = await getPublicOffers();

  // Group by network so the three networks stay visually separated.
  const groups = new Map<string, { name: string; accent: string; offers: AffiliateOfferRecord[] }>();
  for (const offer of offers) {
    const network = offerNetwork(offer);
    const key = network?._id || "other";
    if (!groups.has(key)) {
      groups.set(key, {
        name: network?.name || "—",
        accent: network?.accent_color || DEFAULT_ACCENT,
        offers: [],
      });
    }
    groups.get(key)!.offers.push(offer);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <header className="mb-7">
        <span className="glass inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-foreground/60">
          <Tags className="h-3.5 w-3.5" />
          {t.offersPage.found} {offers.length} {t.offersPage.offers}
        </span>
        <h1 className="mt-3 font-display text-2xl font-extrabold text-white sm:text-4xl">{t.offersPage.title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-foreground/60 sm:text-base">{t.offersPage.subtitle}</p>
      </header>

      {offers.length === 0 ? (
        <div className="glass rounded-3xl px-6 py-16 text-center">
          <p className="font-display text-lg font-bold text-white">{t.offersPage.empty}</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-foreground/50">{t.offersPage.emptySub}</p>
          <Link
            href="/catalog"
            className="mt-6 inline-block rounded-xl bg-gradient-to-r from-[#4c6fff] to-[#a855f7] px-6 py-3 text-sm font-bold text-white"
          >
            {t.nav.catalog}
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {[...groups.values()].map((group) => (
            <section key={group.name}>
              <h2 className="mb-3 flex items-center gap-2.5">
                <span className="h-5 w-1.5 rounded-full" style={{ backgroundColor: group.accent }} />
                <span className="font-display text-lg font-extrabold text-white">{group.name}</span>
                <span className="rounded-lg bg-white/6 px-2 py-0.5 text-[11px] font-bold text-foreground/55">
                  {group.offers.length}
                </span>
              </h2>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {group.offers.map((offer, index) => {
                  const service = offer.service && typeof offer.service === "object" ? (offer.service as ServiceRecord) : null;
                  return (
                    <a
                      key={offer._id}
                      href={`/go/offer/${offer._id}`}
                      target="_blank"
                      rel="nofollow sponsored noopener noreferrer"
                      className="glass glass-hover animate-fade-up group flex flex-col rounded-2xl border-l-2 p-4"
                      style={{ borderLeftColor: group.accent, animationDelay: `${Math.min(index, 9) * 40}ms` }}
                    >
                      <span className="flex items-start justify-between gap-2">
                        <span className="font-display text-sm font-bold leading-snug text-white">
                          {offer.offer_name}
                        </span>
                        <ArrowUpRight className="h-4 w-4 shrink-0 text-foreground/35 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white" />
                      </span>

                      <span className="mt-2.5 flex flex-wrap items-center gap-1.5">
                        <span
                          className="rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                          style={{ backgroundColor: `${group.accent}26`, color: group.accent }}
                        >
                          {t.admin.offerManager.payoutModels[(offer.payout_model || "other") as PayoutModel]}
                        </span>
                        {service && (
                          <span className="rounded-lg bg-white/6 px-2 py-0.5 text-[10px] font-semibold text-foreground/55">
                            {t.offersPage.forService}: {service.name}
                          </span>
                        )}
                      </span>

                      <span className="mt-3 text-xs font-bold text-foreground/45 transition-colors group-hover:text-white">
                        {t.offersPage.open} →
                      </span>
                    </a>
                  );
                })}
              </div>
            </section>
          ))}

          <p className="flex items-start gap-2 rounded-2xl bg-white/4 px-4 py-3 text-xs text-foreground/40">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {t.offersPage.disclosure}
          </p>
        </div>
      )}
    </div>
  );
}
