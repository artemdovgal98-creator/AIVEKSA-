"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Copy, KeyRound, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useLang } from "@/lib/i18n/context";
import { NotConfigured, Pill } from "@/components/admin/kit";
import type { MarketNetwork } from "@/components/admin/marketplace/types";

const TEXT = {
  ru: {
    param: "Параметр click_id (из документации сети)",
    paramHint: "например subid, sub1, clickref. Пусто — click_id не передаётся",
    save: "Сохранить",
    postback: "Postback",
    generate: "Создать postback URL",
    regenerate: "Новый секрет",
    copyOnce: "Скопируйте сейчас и вставьте в панель сети — секрет больше не будет показан. Замените {…} на макросы сети.",
    copied: "Скопировано",
  },
  uk: {
    param: "Параметр click_id (з документації мережі)",
    paramHint: "наприклад subid, sub1, clickref. Порожньо — click_id не передається",
    save: "Зберегти",
    postback: "Postback",
    generate: "Створити postback URL",
    regenerate: "Новий секрет",
    copyOnce: "Скопіюйте зараз і вставте в панель мережі — секрет більше не буде показано. Замініть {…} на макроси мережі.",
    copied: "Скопійовано",
  },
  en: {
    param: "click_id parameter (from the network docs)",
    paramHint: "e.g. subid, sub1, clickref. Empty — click_id is not passed",
    save: "Save",
    postback: "Postback",
    generate: "Create postback URL",
    regenerate: "New secret",
    copyOnce: "Copy it now into the network panel — the secret will not be shown again. Replace {…} with the network's macros.",
    copied: "Copied",
  },
};

/** Per-network tracking: documented click-id parameter + secret-protected postback URL. */
export function NetworkTracking({ network, onChanged }: { network: MarketNetwork; onChanged: () => void }) {
  const { lang } = useLang();
  const t = TEXT[lang as keyof typeof TEXT] || TEXT.ru;
  const [param, setParam] = useState(network.subid_param);
  const [busy, setBusy] = useState<"param" | "secret" | null>(null);
  const [postbackUrl, setPostbackUrl] = useState<string | null>(null);

  const update = async (body: Record<string, unknown>, kind: "param" | "secret") => {
    setBusy(kind);
    const response = await api.put<{ subid_param: string; postbackConfigured: boolean; postbackUrl: string | null }>(
      `/api/admin/networks/${network._id}`,
      body
    );
    setBusy(null);
    if (!response.ok || !response.data) {
      console.error("[admin/network-tracking] update failed:", response.error);
      toast.error(String(response.error || "Error"));
      return;
    }
    if (response.data.postbackUrl) setPostbackUrl(response.data.postbackUrl);
    toast.success("OK");
    onChanged();
  };

  const field =
    "min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 font-mono text-xs text-white outline-none focus:border-[color:var(--neon-cyan)]/60";

  return (
    <div className="mt-3 space-y-2 border-t border-white/8 pt-3 text-xs">
      <label className="block text-[11px] text-foreground/50">{t.param}</label>
      <div className="flex gap-2">
        <input className={field} value={param} onChange={(e) => setParam(e.target.value.trim())} placeholder={t.paramHint} />
        <button
          type="button"
          disabled={busy !== null || param === network.subid_param}
          onClick={() => update({ subid_param: param }, "param")}
          className="rounded-lg bg-white/10 px-3 py-1.5 font-semibold text-white hover:bg-white/15 disabled:opacity-40"
        >
          {busy === "param" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t.save}
        </button>
      </div>

      <div className="flex items-center justify-between gap-2 pt-1">
        <span className="flex items-center gap-1.5 text-foreground/55">
          <KeyRound className="h-3.5 w-3.5" />
          {t.postback}
        </span>
        {network.postbackConfigured ? <Pill tone="green">CONFIGURED</Pill> : <NotConfigured />}
      </div>
      <button
        type="button"
        disabled={busy !== null}
        onClick={() => update({ regenerateSecret: true }, "secret")}
        className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 font-semibold text-[color:var(--neon-cyan)] hover:bg-white/5 disabled:opacity-40"
      >
        {busy === "secret" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        {network.postbackConfigured ? t.regenerate : t.generate}
      </button>
      {postbackUrl && (
        <div className="space-y-1.5 rounded-lg bg-amber-400/10 p-2">
          <p className="text-[11px] text-amber-200">{t.copyOnce}</p>
          <div className="flex items-start gap-2">
            <code className="min-w-0 flex-1 break-all text-[10px] text-foreground/80">{postbackUrl}</code>
            <button
              type="button"
              aria-label="Copy"
              onClick={() => navigator.clipboard.writeText(postbackUrl).then(() => toast.success(t.copied))}
              className="rounded-md p-1 hover:bg-white/10"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
