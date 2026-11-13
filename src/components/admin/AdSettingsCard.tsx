"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Megaphone } from "lucide-react";
import { api } from "@/lib/api";
import { useAdminDict } from "@/lib/i18n/admin-dict";
import { Switch } from "@/components/ui/switch";
import { Field, Segmented, type SegmentedProps, inputClass, primaryButton } from "@/components/admin/kit";

const SegmentedTab = Segmented as (props: SegmentedProps<Tab>) => React.JSX.Element;

interface AdSlotsConfig {
  topEnabled: boolean;
  topCode: string;
  topMaxHeight: number;
  bottomEnabled: boolean;
  bottomCode: string;
  bottomMaxHeight: number;
  socialBarCode: string;
}

const EMPTY: AdSlotsConfig = {
  topEnabled: false,
  topCode: "",
  topMaxHeight: 250,
  bottomEnabled: false,
  bottomCode: "",
  bottomMaxHeight: 250,
  socialBarCode: "",
};

type Tab = "top" | "bottom" | "social";

const codeField = `${inputClass} min-h-[160px] font-mono text-xs`;

/** Admin → System Settings → Ads: top/bottom network ad code + the site-wide Social Bar script. One place, next to Payments/Site Tags. */
export function AdSettingsCard() {
  const a = useAdminDict();
  const d = a.ads;
  const [config, setConfig] = useState<AdSlotsConfig | null>(null);
  const [tab, setTab] = useState<Tab>("top");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<AdSlotsConfig>("/api/admin/ad-slots").then((response) => {
      if (!response.ok || !response.data) {
        console.error("[admin/ad-settings] load failed:", response.error);
        toast.error(String(response.error || a.common.error));
        setConfig(EMPTY);
        return;
      }
      setConfig(response.data);
    });
  }, [a.common.error]);

  const set = <K extends keyof AdSlotsConfig>(key: K, value: AdSlotsConfig[K]) =>
    setConfig((c) => (c ? { ...c, [key]: value } : c));

  const save = async () => {
    if (!config) return;
    setSaving(true);
    const response = await api.put<AdSlotsConfig>("/api/admin/ad-slots", config);
    setSaving(false);
    if (!response.ok || !response.data) {
      console.error("[admin/ad-settings] save failed:", response.error);
      toast.error(String(response.error || a.common.error));
      return;
    }
    setConfig(response.data);
    toast.success(a.common.saved);
  };

  return (
    <section className="glass rounded-2xl p-5">
      <div className="mb-1 flex items-center gap-2.5">
        <Megaphone className="h-5 w-5 text-[color:var(--neon-cyan)]" />
        <h3 className="flex-1 font-display text-sm font-bold text-white">{d.title}</h3>
      </div>
      <p className="mb-4 text-xs text-foreground/50">{d.subtitle}</p>

      {!config ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-foreground/40" />
        </div>
      ) : (
        <>
          <SegmentedTab
            value={tab}
            onChange={setTab}
            options={[
              { value: "top", label: d.tabTop },
              { value: "bottom", label: d.tabBottom },
              { value: "social", label: d.tabSocialBar },
            ]}
          />

          <div className="mt-4">
            {tab !== "social" ? (
              <div className="space-y-4">
                <label className="flex items-center gap-2.5 text-sm font-semibold text-white">
                  <Switch
                    checked={tab === "top" ? config.topEnabled : config.bottomEnabled}
                    onCheckedChange={(v) => set(tab === "top" ? "topEnabled" : "bottomEnabled", v)}
                  />
                  {d.showBlock}
                </label>
                <Field label={d.code} hint={d.codeHint}>
                  <textarea
                    className={codeField}
                    value={tab === "top" ? config.topCode : config.bottomCode}
                    onChange={(e) => set(tab === "top" ? "topCode" : "bottomCode", e.target.value)}
                    placeholder={d.codePlaceholder}
                  />
                </Field>
                <Field label={d.maxHeight} hint={d.maxHeightHint}>
                  <input
                    className={`${inputClass} max-w-[160px]`}
                    inputMode="numeric"
                    value={tab === "top" ? config.topMaxHeight : config.bottomMaxHeight}
                    onChange={(e) => set(tab === "top" ? "topMaxHeight" : "bottomMaxHeight", Number(e.target.value) || 0)}
                  />
                </Field>
              </div>
            ) : (
              <Field label={d.socialBarTitle} hint={d.socialBarHint}>
                <textarea
                  className={codeField}
                  value={config.socialBarCode}
                  onChange={(e) => set("socialBarCode", e.target.value)}
                  placeholder={d.socialBarPlaceholder}
                />
              </Field>
            )}
          </div>

          <div className="mt-5">
            <button type="button" className={primaryButton} disabled={saving} onClick={save}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {d.save}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
