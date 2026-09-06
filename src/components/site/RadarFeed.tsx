"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useLang } from "@/lib/i18n/context";
import { radarImage, radarSummary, radarTitle } from "@/lib/localize";
import { ExternalLink, Pin, Radar } from "lucide-react";
import { RADAR_TYPES, type RadarRecord, type RadarType, type ServiceRecord } from "@/lib/types";

const IMPORTANCE_STYLE: Record<string, string> = {
  high: "bg-rose-400/15 text-rose-300",
  normal: "bg-[color:var(--neon-blue)]/18 text-[#a9bcff]",
  low: "bg-white/8 text-foreground/60",
};

const TYPE_STYLE: Record<string, string> = {
  model: "bg-[color:var(--neon-violet)]/18 text-[#d8b4fe]",
  tool: "bg-[color:var(--neon-cyan)]/16 text-[color:var(--neon-cyan)]",
  update: "bg-emerald-400/14 text-emerald-300",
  research: "bg-sky-400/14 text-sky-300",
  funding: "bg-amber-300/14 text-amber-300",
  trend: "bg-orange-400/14 text-orange-300",
};

function formatDate(value: string | undefined, lang: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const locale = lang === "en" ? "en-GB" : lang === "uk" ? "uk-UA" : "ru-RU";
  return date.toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" });
}

/** Full AI Radar feed with a client-side type filter. */
export function RadarFeed({ items }: { items: RadarRecord[] }) {
  const { lang, t } = useLang();
  const [type, setType] = useState<RadarType | "all">("all");

  const visible = useMemo(
    () => (type === "all" ? items : items.filter((item) => item.radar_type === type)),
    [items, type]
  );

  return (
    <div className="space-y-5">
      <div className="rail no-scrollbar flex">
        {(["all", ...RADAR_TYPES] as (RadarType | "all")[]).map((entry) => (
          <button
            key={entry}
            type="button"
            onClick={() => setType(entry)}
            className={`shrink-0 rounded-xl px-3.5 py-2 text-[13px] font-semibold transition-all ${
              type === entry
                ? "bg-gradient-to-r from-[#4c6fff] to-[#a855f7] text-white"
                : "glass text-foreground/65 hover:text-white"
            }`}
          >
            {entry === "all" ? t.radar.all : t.radar.types[entry]}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="glass rounded-3xl px-6 py-16 text-center text-sm text-foreground/55">{t.radar.empty}</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((item, index) => (
            <RadarCard key={item._id} item={item} delay={Math.min(index, 9) * 35} />
          ))}
        </div>
      )}
    </div>
  );
}

export function RadarCard({ item, delay = 0 }: { item: RadarRecord; delay?: number }) {
  const { lang, t } = useLang();
  const title = radarTitle(item, lang);
  const summary = radarSummary(item, lang);
  const image = radarImage(item);
  const service = (item.service && typeof item.service === "object" ? item.service : null) as ServiceRecord | null;
  const type = item.radar_type || "update";
  const importance = item.importance || "normal";

  return (
    <article
      className="glass glass-hover animate-fade-up flex min-w-0 flex-col overflow-hidden rounded-2xl"
      style={{ animationDelay: `${delay}ms` }}
    >
      {image && (
        <span className="relative block h-36 w-full overflow-hidden">
          <img src={image} alt="" loading="lazy" className="h-full w-full object-cover" />
          <span className="absolute inset-0 bg-gradient-to-t from-[#0b0b16] via-transparent to-transparent" />
        </span>
      )}

      <div className="flex min-w-0 flex-1 flex-col p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
          <span className={`rounded-full px-2 py-0.5 ${TYPE_STYLE[type] || TYPE_STYLE.update}`}>
            {t.radar.types[type]}
          </span>
          <span className={`rounded-full px-2 py-0.5 ${IMPORTANCE_STYLE[importance]}`}>
            {t.radar.importance[importance]}
          </span>
          {item.pinned === "yes" && (
            <span className="flex items-center gap-1 rounded-full bg-white/8 px-2 py-0.5 text-foreground/65">
              <Pin className="h-3 w-3" />
              {t.radar.pinned}
            </span>
          )}
          <span className="ml-auto text-foreground/40">{formatDate(item.published_at || item.createdAt, lang)}</span>
        </div>

        <h3 className="font-display mt-2.5 break-anywhere text-[15px] font-bold leading-snug text-white sm:text-base">
          {title}
        </h3>
        {summary && <p className="mt-2 break-anywhere text-[13px] leading-relaxed text-foreground/65">{summary}</p>}

        <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
          {service && (
            <Link
              href={`/ai/${service.slug}`}
              className="min-w-0 flex-1 rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-center text-[13px] font-semibold text-foreground/85 transition-colors hover:bg-white/10 hover:text-white"
            >
              <span className="block truncate">{service.name}</span>
            </Link>
          )}
          {item.source_url && (
            <a
              href={item.source_url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#4c6fff] to-[#a855f7] px-3 py-2 text-[13px] font-semibold text-white"
            >
              <span className="truncate">{item.source_name || t.radar.open}</span>
              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

/** Compact radar strip used on the home page. */
export function RadarStrip({ items }: { items: RadarRecord[] }) {
  const { t } = useLang();
  if (items.length === 0) return null;
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item, index) => (
        <RadarCard key={item._id} item={item} delay={index * 40} />
      ))}
    </div>
  );
}

export function RadarEmptyIcon() {
  return <Radar className="h-8 w-8 text-[color:var(--neon-cyan)]" />;
}
