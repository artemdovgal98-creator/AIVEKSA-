"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Code2, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useLang } from "@/lib/i18n/context";
import { NotConfigured, Pill } from "@/components/admin/kit";
import { SITE_CODE_SLOTS } from "@/lib/site-code-slots";

interface SiteCode {
  values: Record<string, string>;
  counts: Record<string, number>;
}

const TEXT = {
  ru: {
    title: "Код на сайте · верификация и виджеты",
    subtitle: "Вставьте код как есть. Подключаются только теги <meta> и <script>, изменения появляются на сайте примерно через 30 секунд.",
    headGroup: "В <head>",
    bodyGroup: "Перед </body>",
    tags: "тегов",
    save: "Сохранить код",
    noTags: "В коде не найдено тегов <meta> или <script>",
    slots: {
      head: { label: "Верификация", hint: "Monetag, Mitgo/Admitad…", placeholder: '<meta name="monetag" content="…">' },
      head_analytics: { label: "Аналитика и счётчики", hint: "Google Analytics, Google Tag Manager, Яндекс.Метрика…", placeholder: "<script>…gtag/ym(…)…</script>" },
      head_social: { label: "Соцсети и прочие подтверждения", hint: "Facebook Domain Verification, Pinterest, VK…", placeholder: '<meta name="facebook-domain-verification" content="…">' },
      body: { label: "Виджеты", hint: "GetChatAds…", placeholder: '<script src="…"></script>' },
      body_chat: { label: "Чат-виджеты", hint: "Crisp, Tawk.to, Jivo…", placeholder: '<script src="…chat…"></script>' },
      body_ads: { label: "Push и рекламные сети", hint: "PropellerAds, Adsterra, Exoclick…", placeholder: '<script src="…ads…"></script>' },
    },
  },
  uk: {
    title: "Код на сайті · верифікація та віджети",
    subtitle: "Вставте код як є. Підключаються лише теги <meta> і <script>, зміни з'являються на сайті приблизно за 30 секунд.",
    headGroup: "У <head>",
    bodyGroup: "Перед </body>",
    tags: "тегів",
    save: "Зберегти код",
    noTags: "У коді не знайдено тегів <meta> або <script>",
    slots: {
      head: { label: "Верифікація", hint: "Monetag, Mitgo/Admitad…", placeholder: '<meta name="monetag" content="…">' },
      head_analytics: { label: "Аналітика та лічильники", hint: "Google Analytics, Google Tag Manager, Яндекс.Метрика…", placeholder: "<script>…gtag/ym(…)…</script>" },
      head_social: { label: "Соцмережі та інші підтвердження", hint: "Facebook Domain Verification, Pinterest, VK…", placeholder: '<meta name="facebook-domain-verification" content="…">' },
      body: { label: "Віджети", hint: "GetChatAds…", placeholder: '<script src="…"></script>' },
      body_chat: { label: "Чат-віджети", hint: "Crisp, Tawk.to, Jivo…", placeholder: '<script src="…chat…"></script>' },
      body_ads: { label: "Push та рекламні мережі", hint: "PropellerAds, Adsterra, Exoclick…", placeholder: '<script src="…ads…"></script>' },
    },
  },
  en: {
    title: "Site code · verification & widgets",
    subtitle: "Paste the code as is. Only <meta> and <script> tags are applied; changes go live in about 30 seconds.",
    headGroup: "In <head>",
    bodyGroup: "Before </body>",
    tags: "tags",
    save: "Save code",
    noTags: "No <meta> or <script> tags found in the code",
    slots: {
      head: { label: "Verification", hint: "Monetag, Mitgo/Admitad…", placeholder: '<meta name="monetag" content="…">' },
      head_analytics: { label: "Analytics", hint: "Google Analytics, Google Tag Manager, Yandex.Metrica…", placeholder: "<script>…gtag/ym(…)…</script>" },
      head_social: { label: "Social & other verifications", hint: "Facebook Domain Verification, Pinterest, VK…", placeholder: '<meta name="facebook-domain-verification" content="…">' },
      body: { label: "Widgets", hint: "GetChatAds…", placeholder: '<script src="…"></script>' },
      body_chat: { label: "Chat widgets", hint: "Crisp, Tawk.to, Jivo…", placeholder: '<script src="…chat…"></script>' },
      body_ads: { label: "Push & ad networks", hint: "PropellerAds, Adsterra, Exoclick…", placeholder: '<script src="…ads…"></script>' },
    },
  },
};

type Lang = keyof typeof TEXT;

const field =
  "min-h-24 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-xs text-white outline-none placeholder:text-foreground/30 focus:border-[color:var(--neon-cyan)]/60";

/** Admin → System Settings → third-party verification / analytics / widget code. */
export function SiteCodeCard() {
  const { lang } = useLang();
  const t = TEXT[lang as Lang] || TEXT.ru;
  const [data, setData] = useState<SiteCode | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const apply = (next: SiteCode) => {
    setData(next);
    setDraft(next.values);
  };

  useEffect(() => {
    api.get<SiteCode>("/api/admin/site-code").then((response) => {
      if (!response.ok || !response.data) {
        console.error("[admin/site-code] load failed:", response.error);
        return;
      }
      apply(response.data);
    });
  }, []);

  const save = async () => {
    setSaving(true);
    const response = await api.put<SiteCode>("/api/admin/site-code", { values: draft });
    setSaving(false);
    if (!response.ok || !response.data) {
      console.error("[admin/site-code] save failed:", response.error);
      toast.error(response.error === "NO_TAGS" ? t.noTags : String(response.error || "Error"));
      return;
    }
    apply(response.data);
    toast.success("OK");
  };

  if (!data) {
    return (
      <section className="glass flex justify-center rounded-2xl p-5">
        <Loader2 className="h-5 w-5 animate-spin text-foreground/40" />
      </section>
    );
  }

  const count = (key: string) => {
    const n = data.counts[key] || 0;
    return n > 0 ? <Pill tone="green">{`${n} ${t.tags}`}</Pill> : <NotConfigured />;
  };

  const group = (scope: "head" | "body", title: string) => (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground/45">{title}</p>
      <div className="space-y-3">
        {SITE_CODE_SLOTS.filter((slot) => slot.scope === scope).map((slot) => {
          const meta = t.slots[slot.key as keyof typeof t.slots];
          return (
            <label key={slot.key} className="block space-y-1">
              <span className="flex items-center justify-between gap-2 text-[11px] text-foreground/55">
                <span>
                  {meta.label} <span className="text-foreground/35">— {meta.hint}</span>
                </span>
                {count(slot.key)}
              </span>
              <textarea
                className={field}
                value={draft[slot.key] ?? ""}
                onChange={(e) => setDraft((current) => ({ ...current, [slot.key]: e.target.value }))}
                placeholder={meta.placeholder}
                spellCheck={false}
              />
            </label>
          );
        })}
      </div>
    </div>
  );

  return (
    <section className="glass rounded-2xl p-5">
      <div className="mb-1 flex items-center gap-2.5">
        <Code2 className="h-5 w-5 text-[color:var(--neon-cyan)]" />
        <h3 className="flex-1 font-display text-sm font-bold text-white">{t.title}</h3>
      </div>
      <p className="mb-4 text-xs text-foreground/50">{t.subtitle}</p>

      <div className="grid gap-5 sm:grid-cols-2">
        {group("head", t.headGroup)}
        {group("body", t.bodyGroup)}
      </div>

      <button
        type="button"
        disabled={saving}
        onClick={save}
        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#4c6fff] to-[#a855f7] px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
      >
        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
        {t.save}
      </button>
    </section>
  );
}
