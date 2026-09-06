import { getServerDict } from "@/lib/i18n/server";
import { getOwnerProfile } from "@/lib/profile";
import { pickLocalized } from "@/lib/localize";
import { fileUrl, PROFILE_LINK_FIELDS, SOCIAL_FIELDS, type SocialField } from "@/lib/types";
import { Link2, Phone } from "lucide-react";

/** Brand label + accent for every supported social platform. */
const SOCIAL_META: Record<SocialField, { label: string; icon: string; accent: string }> = {
  telegram_url: { label: "Telegram", icon: "✈️", accent: "#229ED9" },
  twitter_url: { label: "X / Twitter", icon: "𝕏", accent: "#e7e9ea" },
  tiktok_url: { label: "TikTok", icon: "🎵", accent: "#ff0050" },
  facebook_url: { label: "Facebook", icon: "f", accent: "#1877F2" },
  instagram_url: { label: "Instagram", icon: "📸", accent: "#E1306C" },
  youtube_url: { label: "YouTube", icon: "▶", accent: "#FF0000" },
  linkedin_url: { label: "LinkedIn", icon: "in", accent: "#0A66C2" },
  discord_url: { label: "Discord", icon: "🎮", accent: "#5865F2" },
  website_url: { label: "Website", icon: "🌐", accent: "#7c8cff" },
};

const CUSTOM_LINKS = PROFILE_LINK_FIELDS.filter((field) => field.startsWith("link_"));

/**
 * Contact + social block rendered right under the categories on the home page.
 * Renders nothing until the owner fills their profile and enables it.
 */
export async function OwnerContacts() {
  const { lang, t } = await getServerDict();
  const owner = await getOwnerProfile();
  if (!owner) return null;

  const socials = SOCIAL_FIELDS.map((field) => ({ field, url: (owner as any)[field] as string }))
    .filter((entry) => Boolean(entry.url));
  const links = CUSTOM_LINKS.map((field) => (owner as any)[field] as string).filter(Boolean);
  const phones = [owner.phone_1, owner.phone_2].filter(Boolean) as string[];

  if (socials.length === 0 && links.length === 0 && phones.length === 0) return null;

  const headline = pickLocalized(owner, "title", lang) || owner.name || t.contacts.title;
  const bio = pickLocalized(owner, "bio", lang);
  const avatar = fileUrl(owner.photos) || owner.image || "";

  console.log("[owner-contacts] rendering", socials.length, "socials,", links.length, "links");

  return (
    <section className="glass-strong min-w-0 overflow-hidden rounded-3xl p-5 sm:p-7">
      <div className="flex min-w-0 flex-wrap items-center gap-4">
        {avatar ? (
          <img
            src={avatar}
            alt=""
            className="h-16 w-16 shrink-0 rounded-2xl border border-white/12 object-cover"
          />
        ) : (
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#4c6fff] to-[#a855f7] text-xl font-extrabold text-white">
            {(owner.name || "A").charAt(0).toUpperCase()}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="font-display break-anywhere text-lg font-bold text-white sm:text-xl">{headline}</h2>
          <p className="mt-1 break-anywhere text-sm text-foreground/60">{bio || t.contacts.subtitle}</p>
        </div>
      </div>

      {socials.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground/45">
            {t.contacts.socials}
          </p>
          <div className="flex flex-wrap gap-2">
            {socials.map(({ field, url }) => {
              const meta = SOCIAL_META[field];
              return (
                <a
                  key={field}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="glass glass-hover flex max-w-full items-center gap-2 rounded-xl px-3 py-2 text-[13px] font-semibold text-foreground/85 hover:text-white"
                >
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[12px] font-bold text-white"
                    style={{ backgroundColor: meta.accent }}
                  >
                    {meta.icon}
                  </span>
                  <span className="truncate">{meta.label}</span>
                </a>
              );
            })}
          </div>
        </div>
      )}

      {(phones.length > 0 || links.length > 0) && (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {phones.length > 0 && (
            <div className="min-w-0">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground/45">
                {t.contacts.phone}
              </p>
              <div className="flex flex-wrap gap-2">
                {phones.map((phone) => (
                  <a
                    key={phone}
                    href={`tel:${phone.replace(/[^+\d]/g, "")}`}
                    className="glass glass-hover flex max-w-full items-center gap-2 rounded-xl px-3 py-2 text-[13px] font-semibold text-foreground/85 hover:text-white"
                  >
                    <Phone className="h-3.5 w-3.5 shrink-0 text-[color:var(--neon-cyan)]" />
                    <span className="truncate">{phone}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {links.length > 0 && (
            <div className="min-w-0">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground/45">
                {t.contacts.links}
              </p>
              <div className="flex flex-wrap gap-2">
                {links.map((link) => (
                  <a
                    key={link}
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="glass glass-hover flex max-w-full items-center gap-2 rounded-xl px-3 py-2 text-[13px] font-semibold text-foreground/85 hover:text-white"
                  >
                    <Link2 className="h-3.5 w-3.5 shrink-0 text-[color:var(--neon-violet)]" />
                    <span className="truncate">{prettyLink(link)}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

/** Shows a link as its host + first path segment, never the raw long URL. */
function prettyLink(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.host}${parsed.pathname === "/" ? "" : parsed.pathname}`.slice(0, 42);
  } catch {
    return url.slice(0, 42);
  }
}
