"use client";

import { useState } from "react";
import { useLang } from "@/lib/i18n/context";
import { api } from "@/lib/api";
import { FileField } from "@/components/admin/FileField";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { MAX_PROFILE_PHOTOS, SOCIAL_FIELDS, type SocialField, type TotalumFile } from "@/lib/types";

const SOCIAL_LABELS: Record<SocialField, string> = {
  telegram_url: "Telegram",
  twitter_url: "X / Twitter",
  tiktok_url: "TikTok",
  facebook_url: "Facebook",
  instagram_url: "Instagram",
  youtube_url: "YouTube",
  linkedin_url: "LinkedIn",
  discord_url: "Discord",
  website_url: "Website",
};

const LINK_KEYS = ["link_1", "link_2", "link_3", "link_4", "link_5"] as const;
const PHONE_KEYS = ["phone_1", "phone_2"] as const;

export interface ProfileDraft extends Record<string, any> {
  name?: string;
  photos?: TotalumFile[];
  show_contacts?: "yes" | "no";
}

/**
 * Public profile editor.
 *
 * Everything filled in here (socials, phones, custom links) is rendered on the
 * home page contact block as soon as "show contacts" is on.
 */
export function ProfileEditor({ initial }: { initial: ProfileDraft }) {
  const { t } = useLang();
  const p = t.profileForm;

  const [draft, setDraft] = useState<ProfileDraft>({
    name: initial.name || "",
    title_ru: initial.title_ru || "",
    title_uk: initial.title_uk || "",
    title_en: initial.title_en || "",
    bio_ru: initial.bio_ru || "",
    bio_uk: initial.bio_uk || "",
    bio_en: initial.bio_en || "",
    photos: Array.isArray(initial.photos) ? initial.photos : [],
    show_contacts: initial.show_contacts === "yes" ? "yes" : "no",
    ...Object.fromEntries(LINK_KEYS.map((key) => [key, initial[key] || ""])),
    ...Object.fromEntries(PHONE_KEYS.map((key) => [key, initial[key] || ""])),
    ...Object.fromEntries(SOCIAL_FIELDS.map((key) => [key, initial[key] || ""])),
  });
  const [saving, setSaving] = useState(false);

  const set = (key: string, value: any) => setDraft((current) => ({ ...current, [key]: value }));

  const save = async () => {
    setSaving(true);
    const response = await api.put("/api/me", draft);
    setSaving(false);

    if (!response.ok) {
      console.error("[profile-editor] save failed:", response.error);
      toast.error(typeof response.error === "string" ? response.error : JSON.stringify(response.error));
      return;
    }
    console.log("[profile-editor] profile saved");
    toast.success(p.saved);
  };

  const input = (key: string, label: string, placeholder = "") => (
    <div className="min-w-0">
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-foreground/45">
        {label}
      </label>
      <input
        value={draft[key] ?? ""}
        onChange={(event) => set(key, event.target.value)}
        placeholder={placeholder}
        className="w-full min-w-0 rounded-xl bg-white/5 px-4 py-3 text-sm text-white placeholder:text-foreground/25 focus:outline-none focus:ring-1 focus:ring-[color:var(--neon-blue)]/50"
      />
    </div>
  );

  const area = (key: string, label: string) => (
    <div className="min-w-0 sm:col-span-2">
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-foreground/45">
        {label}
      </label>
      <textarea
        value={draft[key] ?? ""}
        onChange={(event) => set(key, event.target.value)}
        rows={3}
        className="w-full min-w-0 resize-y rounded-xl bg-white/5 px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[color:var(--neon-blue)]/50"
      />
    </div>
  );

  return (
    <section className="glass animate-fade-up mt-4 min-w-0 rounded-3xl p-5 sm:p-6">
      <header className="mb-5">
        <h2 className="font-display text-base font-bold text-white">{p.title}</h2>
        <p className="mt-1 text-sm text-foreground/55">{p.subtitle}</p>
      </header>

      <div className="grid min-w-0 gap-4 sm:grid-cols-2">
        {input("name", p.displayName)}
        <label className="glass flex cursor-pointer items-center justify-between gap-3 rounded-xl px-4 py-3">
          <span className="text-sm font-medium text-foreground/80">{p.showContacts}</span>
          <button
            type="button"
            onClick={() => set("show_contacts", draft.show_contacts === "yes" ? "no" : "yes")}
            aria-pressed={draft.show_contacts === "yes"}
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
              draft.show_contacts === "yes" ? "bg-gradient-to-r from-[#4c6fff] to-[#a855f7]" : "bg-white/12"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                draft.show_contacts === "yes" ? "translate-x-5.5" : "translate-x-0.5"
              }`}
            />
          </button>
        </label>

        {input("title_ru", `${p.headline} RU`)}
        {input("title_uk", `${p.headline} UK`)}
        {input("title_en", `${p.headline} EN`)}
        <span className="hidden sm:block" />

        {area("bio_ru", `${p.bio} RU`)}
        {area("bio_uk", `${p.bio} UK`)}
        {area("bio_en", `${p.bio} EN`)}

        <div className="sm:col-span-2">
          <FileField
            label={p.photos}
            hint={p.photosHint}
            max={MAX_PROFILE_PHOTOS}
            endpoint="/api/me/upload"
            value={Array.isArray(draft.photos) ? draft.photos : []}
            onChange={(next) => set("photos", next)}
          />
        </div>

        <div className="sm:col-span-2">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground/45">{p.phones}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {PHONE_KEYS.map((key, index) => input(key, `${p.phone} ${index + 1}`, "+34 600 000 000"))}
          </div>
        </div>

        <div className="sm:col-span-2">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground/45">{p.socials}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {SOCIAL_FIELDS.map((key) => input(key, SOCIAL_LABELS[key], "https://…"))}
          </div>
        </div>

        <div className="sm:col-span-2">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground/45">{p.customLinks}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {LINK_KEYS.map((key, index) => input(key, `${p.link} ${index + 1}`, "https://…"))}
          </div>
        </div>
      </div>

      <Button
        onClick={save}
        disabled={saving}
        className="glow-primary mt-6 h-12 w-full rounded-2xl bg-gradient-to-r from-[#4c6fff] to-[#a855f7] font-bold text-white sm:w-auto sm:px-10"
      >
        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
        {p.save}
      </Button>
    </section>
  );
}
