"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Code2, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useLang } from "@/lib/i18n/context";
import { NotConfigured, Pill } from "@/components/admin/kit";

interface SiteCode {
  head: string;
  body: string;
  headTags: number;
  bodyTags: number;
}

const TEXT = {
  ru: {
    title: "Код на сайте · верификация и виджеты",
    subtitle: "Вставьте код как есть (например, мета-тег Monetag или скрипт GetChatAds). Подключаются только теги <meta> и <script>, изменения появляются на сайте примерно через 30 секунд.",
    head: "Код в <head> (мета-теги верификации: Monetag, Mitgo/Admitad…)",
    body: "Код перед </body> (скрипты виджетов: GetChatAds…)",
    tags: "тегов",
    save: "Сохранить код",
    noTags: "В коде не найдено тегов <meta> или <script>",
  },
  uk: {
    title: "Код на сайті · верифікація та віджети",
    subtitle: "Вставте код як є (наприклад, мета-тег Monetag або скрипт GetChatAds). Підключаються лише теги <meta> і <script>, зміни з'являються на сайті приблизно за 30 секунд.",
    head: "Код у <head> (мета-теги верифікації: Monetag, Mitgo/Admitad…)",
    body: "Код перед </body> (скрипти віджетів: GetChatAds…)",
    tags: "тегів",
    save: "Зберегти код",
    noTags: "У коді не знайдено тегів <meta> або <script>",
  },
  en: {
    title: "Site code · verification & widgets",
    subtitle: "Paste the code as is (e.g. the Monetag meta tag or the GetChatAds script). Only <meta> and <script> tags are applied; changes go live in about 30 seconds.",
    head: "Code in <head> (verification meta tags: Monetag, Mitgo/Admitad…)",
    body: "Code before </body> (widget scripts: GetChatAds…)",
    tags: "tags",
    save: "Save code",
    noTags: "No <meta> or <script> tags found in the code",
  },
};

const field =
  "min-h-28 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-xs text-white outline-none placeholder:text-foreground/30 focus:border-[color:var(--neon-cyan)]/60";

/** Admin → System Settings → third-party verification / widget code. */
export function SiteCodeCard() {
  const { lang } = useLang();
  const t = TEXT[lang as keyof typeof TEXT] || TEXT.ru;
  const [data, setData] = useState<SiteCode | null>(null);
  const [head, setHead] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  const apply = (next: SiteCode) => {
    setData(next);
    setHead(next.head);
    setBody(next.body);
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
    const response = await api.put<SiteCode>("/api/admin/site-code", { head, body });
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

  const count = (n: number) => (n > 0 ? <Pill tone="green">{`${n} ${t.tags}`}</Pill> : <NotConfigured />);

  return (
    <section className="glass rounded-2xl p-5">
      <div className="mb-1 flex items-center gap-2.5">
        <Code2 className="h-5 w-5 text-[color:var(--neon-cyan)]" />
        <h3 className="flex-1 font-display text-sm font-bold text-white">{t.title}</h3>
      </div>
      <p className="mb-4 text-xs text-foreground/50">{t.subtitle}</p>

      <div className="space-y-3">
        <label className="block space-y-1">
          <span className="flex items-center justify-between gap-2 text-[11px] text-foreground/55">
            {t.head}
            {count(data.headTags)}
          </span>
          <textarea className={field} value={head} onChange={(e) => setHead(e.target.value)} placeholder='<meta name="monetag" content="…">' spellCheck={false} />
        </label>
        <label className="block space-y-1">
          <span className="flex items-center justify-between gap-2 text-[11px] text-foreground/55">
            {t.body}
            {count(data.bodyTags)}
          </span>
          <textarea className={field} value={body} onChange={(e) => setBody(e.target.value)} placeholder='<script src="…"></script>' spellCheck={false} />
        </label>
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
