"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Code2, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { useAdminDict } from "@/lib/i18n/admin-dict";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { EmptyState, Field, Pill, dangerButton, ghostButton, inputClass, primaryButton } from "@/components/admin/kit";
import type { TagPlacement, TagScope, TagType } from "@/lib/site-tags";

interface SiteTag {
  _id: string;
  name: string;
  tag_type: TagType;
  placement: TagPlacement;
  code: string;
  scope: TagScope;
  enabled: "yes" | "no";
}

const EMPTY = {
  name: "",
  tag_type: "verification" as TagType,
  placement: "head" as TagPlacement,
  scope: "all" as TagScope,
  code: "",
  enabled: true,
};
type Draft = typeof EMPTY;

/** Admin → System Settings → Integrations → unlimited third-party tag manager (replaces the old fixed 6-slot "Site code" block). */
export function SiteTagsCard() {
  const a = useAdminDict();
  const d = a.siteTags;
  const [tags, setTags] = useState<SiteTag[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [edit, setEdit] = useState<{ open: boolean; id: string | null; draft: Draft }>({ open: false, id: null, draft: EMPTY });

  const load = useCallback(async () => {
    const response = await api.get<SiteTag[]>("/api/admin/site-tags");
    if (!response.ok) {
      console.error("[admin/site-tags] load failed:", response.error);
      toast.error(String(response.error || a.common.error));
      setTags([]);
      return;
    }
    setTags(response.data || []);
  }, [a.common.error]);

  useEffect(() => {
    load();
  }, [load]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setEdit((c) => ({ ...c, draft: { ...c.draft, [key]: value } }));

  const toDraft = (tag: SiteTag): Draft => ({
    name: tag.name,
    tag_type: tag.tag_type,
    placement: tag.placement,
    scope: tag.scope,
    code: tag.code,
    enabled: tag.enabled === "yes",
  });

  const save = async () => {
    const { id, draft } = edit;
    const body = { ...draft };
    setBusy(true);
    const response = id ? await api.put(`/api/admin/site-tags/${id}`, body) : await api.post("/api/admin/site-tags", body);
    setBusy(false);
    if (!response.ok) {
      console.error("[admin/site-tags] save failed:", response.error);
      toast.error(String(response.error || d.invalidCode));
      return;
    }
    toast.success(a.common.saved);
    setEdit({ open: false, id: null, draft: EMPTY });
    load();
  };

  const toggleEnabled = async (tag: SiteTag) => {
    const response = await api.put(`/api/admin/site-tags/${tag._id}`, { ...tag, enabled: tag.enabled !== "yes" });
    if (!response.ok) {
      console.error("[admin/site-tags] toggle failed:", response.error);
      toast.error(String(response.error || a.common.error));
      return;
    }
    load();
  };

  const remove = async (tag: SiteTag) => {
    if (!window.confirm(d.confirmDelete)) return;
    const response = await api.delete(`/api/admin/site-tags/${tag._id}`);
    if (!response.ok) {
      console.error("[admin/site-tags] delete failed:", response.error);
      toast.error(String(response.error || a.common.error));
      return;
    }
    toast.success(a.common.saved);
    load();
  };

  return (
    <section className="glass rounded-2xl p-5">
      <div className="mb-1 flex items-center gap-2.5">
        <Code2 className="h-5 w-5 text-[color:var(--neon-cyan)]" />
        <h3 className="flex-1 font-display text-sm font-bold text-white">{d.title}</h3>
        <button type="button" className={primaryButton} onClick={() => setEdit({ open: true, id: null, draft: EMPTY })}>
          <Plus className="h-4 w-4" />
          {d.create}
        </button>
      </div>
      <p className="mb-4 text-xs text-foreground/50">{d.subtitle}</p>

      {tags === null ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-foreground/40" />
        </div>
      ) : tags.length === 0 ? (
        <EmptyState>{d.empty}</EmptyState>
      ) : (
        <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
          {tags.map((tag) => (
            <article key={tag._id} className="flex h-full flex-col justify-between rounded-xl bg-white/4 p-3.5">
              <div className="min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 truncate text-sm font-semibold text-white">{tag.name}</p>
                  <Switch checked={tag.enabled === "yes"} onCheckedChange={() => toggleEnabled(tag)} />
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  <Pill tone="violet">{d.types[tag.tag_type] || tag.tag_type}</Pill>
                  <Pill>{d.placements[tag.placement] || tag.placement}</Pill>
                  <Pill tone={tag.enabled === "yes" ? "green" : "gray"}>{tag.enabled === "yes" ? d.enabled : a.common.inactive}</Pill>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button type="button" className={ghostButton} onClick={() => setEdit({ open: true, id: tag._id, draft: toDraft(tag) })}>
                  <Pencil className="h-4 w-4" />
                  {a.common.edit}
                </button>
                <button type="button" className={dangerButton} onClick={() => remove(tag)}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <Dialog open={edit.open} onOpenChange={(open) => !busy && setEdit((c) => ({ ...c, open }))}>
        <DialogContent className="panel-solid max-h-[92vh] overflow-y-auto border-white/10 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">{edit.id ? d.edit : d.create}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={d.name}>
              <input className={inputClass} value={edit.draft.name} onChange={(e) => set("name", e.target.value)} placeholder={d.namePlaceholder} />
            </Field>
            <Field label={d.type}>
              <select className={inputClass} value={edit.draft.tag_type} onChange={(e) => set("tag_type", e.target.value as TagType)}>
                {Object.entries(d.types).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </Field>
            <Field label={d.placement}>
              <select className={inputClass} value={edit.draft.placement} onChange={(e) => set("placement", e.target.value as TagPlacement)}>
                {Object.entries(d.placements).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </Field>
            <Field label={d.scope}>
              <select className={inputClass} value={edit.draft.scope} onChange={(e) => set("scope", e.target.value as TagScope)}>
                {Object.entries(d.scopes).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field label={d.code} hint={d.codeHint}>
            <textarea
              className={`${inputClass} min-h-[120px] font-mono text-xs`}
              value={edit.draft.code}
              onChange={(e) => set("code", e.target.value)}
              placeholder={d.codePlaceholder}
            />
          </Field>
          <label className="flex items-center gap-2 text-sm text-foreground/75">
            <Switch checked={edit.draft.enabled} onCheckedChange={(v) => set("enabled", v)} /> {d.enabled}
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className={ghostButton} onClick={() => setEdit((c) => ({ ...c, open: false }))}>{a.common.cancel}</button>
            <button type="button" className={primaryButton} disabled={busy} onClick={save}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {a.common.save}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
