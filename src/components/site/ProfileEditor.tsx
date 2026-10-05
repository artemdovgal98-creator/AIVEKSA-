"use client";

import { useState } from "react";
import { useLang } from "@/lib/i18n/context";
import { api } from "@/lib/api";
import { FileField } from "@/components/admin/FileField";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { MAX_PROFILE_PHOTOS, type TotalumFile } from "@/lib/types";

const LINK_KEYS = ["link_1", "link_2"] as const;

export interface ProfileDraft extends Record<string, any> {
  name?: string;
  photos?: TotalumFile[];
  show_contacts?: "yes" | "no";
}

/**
 * Public profile editor.
 *
 * One headline + one description are shown to the user but saved into every
 * language variant (title_ru/uk/en, bio_ru/uk/en) so the home page contact
 * block keeps working unchanged regardless of the visitor's language.
 */
export function ProfileEditor({ initial }: { initial: ProfileDraft }) {
  const { t } = useLang();
  const p = t.profileForm;

  const [draft, setDraft] = useState<ProfileDraft>({
    name: initial.name || "",
    headline: initial.title_ru || initial.title_en || initial.title_uk || "",
    description: initial.bio_ru || initial.bio_en || initial.bio_uk || "",
    photos: Array.isArray(initial.photos) ? initial.photos : [],
    show_contacts: initial.show_contacts === "yes" ? "yes" : "no",
    ...Object.fromEntries(LINK_KEYS.map((key) => [key, initial[key] || ""])),
  });
  const [saving, setSaving] = useState(false);

  const set = (key: string, value: any) => setDraft((current) => ({ ...current, [key]: value }));

  const save = async () => {
    setSaving(true);
    const payload = {
      name: draft.name,
      title_ru: draft.headline,
      title_uk: draft.headline,
      title_en: draft.headline,
      bio_ru: draft.description,
      bio_uk: draft.description,
      bio_en: draft.description,
      photos: draft.photos,
      show_contacts: draft.show_contacts,
      ...Object.fromEntries(LINK_KEYS.map((key) => [key, draft[key] || ""])),
    };
    const response = await api.put("/api/me", payload);
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

        {input("headline", p.headline)}
        <span className="hidden sm:block" />

        {area("description", p.bio)}

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
