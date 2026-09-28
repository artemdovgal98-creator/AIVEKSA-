"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { useLang } from "@/lib/i18n/context";
import { useAdminDict } from "@/lib/i18n/admin-dict";
import { categoryName } from "@/lib/localize";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState, ErrorState, Field, LoadingBlock, PageHeader, dangerButton, ghostButton, inputClass, primaryButton } from "@/components/admin/kit";
import type { CategoryRecord } from "@/lib/types";

interface AdminCategory extends CategoryRecord {
  services_count: number;
}

const EMPTY = { slug: "", name_ru: "", name_uk: "", name_en: "", icon: "", keywords: "", order_position: 99, active: "yes" };
type Draft = typeof EMPTY;

export default function AdminCategoriesPage() {
  const { lang } = useLang();
  const a = useAdminDict();
  const d = a.categories;
  const [items, setItems] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [edit, setEdit] = useState<{ open: boolean; id: string | null; draft: Draft }>({ open: false, id: null, draft: EMPTY });
  const [remove, setRemove] = useState<{ category: AdminCategory; target: string } | null>(null);

  const load = useCallback(async () => {
    const response = await api.get<AdminCategory[]>("/api/admin/categories");
    if (!response.ok) {
      console.error("[admin/categories] load failed:", response.error);
      setError(String(response.error || "error"));
    } else {
      setItems(response.data || []);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toDraft = (category: AdminCategory): Draft => ({
    slug: category.slug || "",
    name_ru: category.name_ru || "",
    name_uk: category.name_uk || "",
    name_en: category.name_en || "",
    icon: category.icon || "",
    keywords: (category as any).keywords || "",
    order_position: Number(category.order_position) || 0,
    active: category.active === "no" ? "no" : "yes",
  });

  const put = async (id: string, draft: Draft) => {
    const response = await api.put(`/api/admin/categories/${id}`, draft);
    if (!response.ok) {
      console.error("[admin/categories] update failed:", response.error);
      toast.error(typeof response.error === "string" ? response.error : a.common.error);
      return false;
    }
    return true;
  };

  const saveDraft = async () => {
    const { id, draft } = edit;
    if (!draft.name_ru.trim() && !draft.name_en.trim()) {
      toast.error(d.nameRu);
      return;
    }
    setBusy(true);
    const ok = id
      ? await put(id, draft)
      : await api.post("/api/admin/categories", draft).then((response) => {
          if (!response.ok) toast.error(typeof response.error === "string" ? response.error : a.common.error);
          return response.ok;
        });
    setBusy(false);
    if (!ok) return;
    toast.success(a.common.saved);
    setEdit({ open: false, id: null, draft: EMPTY });
    load();
  };

  const toggle = async (category: AdminCategory, active: boolean) => {
    const draft = { ...toDraft(category), active: active ? "yes" : "no" };
    setItems((current) => current.map((c) => (c._id === category._id ? { ...c, active: draft.active as "yes" | "no" } : c)));
    if (!(await put(category._id, draft))) load();
  };

  /** Swap positions with the neighbour; positions are re-numbered so ties never block sorting. */
  const move = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    setItems(next);
    setBusy(true);
    const changed = next
      .map((category, position) => ({ category, position: (position + 1) * 10 }))
      .filter(({ category, position }) => Number(category.order_position) !== position);
    for (const { category, position } of changed) {
      await put(category._id, { ...toDraft(category), order_position: position });
    }
    setBusy(false);
    load();
  };

  const confirmRemove = async () => {
    if (!remove) return;
    setBusy(true);
    const query = remove.category.services_count > 0 ? `?reassignTo=${encodeURIComponent(remove.target)}` : "";
    const response = await api.delete(`/api/admin/categories/${remove.category._id}${query}`);
    setBusy(false);
    if (!response.ok) {
      console.error("[admin/categories] delete failed:", response.error);
      toast.error(typeof response.error === "string" ? response.error : a.common.error);
      return;
    }
    toast.success(a.common.saved);
    setRemove(null);
    load();
  };

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorState>{error}</ErrorState>;

  const others = remove ? items.filter((c) => c._id !== remove.category._id) : [];

  return (
    <div>
      <PageHeader
        title={d.title}
        subtitle={d.subtitle}
        actions={
          <button type="button" className={primaryButton} onClick={() => setEdit({ open: true, id: null, draft: { ...EMPTY, order_position: (items.length + 1) * 10 } })}>
            <Plus className="h-4 w-4" />
            {d.add}
          </button>
        }
      />

      {items.length === 0 ? (
        <EmptyState>{a.common.empty}</EmptyState>
      ) : (
        <ul className="space-y-2">
          {items.map((category, index) => (
            <li key={category._id} className={`glass flex flex-wrap items-center gap-3 rounded-2xl px-4 py-3 ${category.active === "no" ? "opacity-60" : ""}`}>
              <div className="flex flex-col">
                <button type="button" title={d.moveUp} disabled={busy || index === 0} onClick={() => move(index, -1)} className="rounded p-0.5 text-foreground/40 hover:text-white disabled:opacity-30">
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button type="button" title={d.moveDown} disabled={busy || index === items.length - 1} onClick={() => move(index, 1)} className="rounded p-0.5 text-foreground/40 hover:text-white disabled:opacity-30">
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
              </div>
              <span className="text-2xl">{category.icon || "•"}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-white">{categoryName(category, lang)}</p>
                <p className="text-[11px] text-foreground/40">
                  /{category.slug} · {category.services_count} {d.services}
                </p>
              </div>
              <Switch checked={category.active !== "no"} onCheckedChange={(checked) => toggle(category, checked)} />
              <button type="button" className="rounded-lg p-2 text-foreground/50 hover:bg-white/8 hover:text-white" onClick={() => setEdit({ open: true, id: category._id, draft: toDraft(category) })}>
                <Pencil className="h-4 w-4" />
              </button>
              <button type="button" className="rounded-lg p-2 text-rose-300/70 hover:bg-rose-500/10 hover:text-rose-300" onClick={() => setRemove({ category, target: "" })}>
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={edit.open} onOpenChange={(open) => !busy && setEdit((current) => ({ ...current, open }))}>
        <DialogContent className="panel-solid border-white/10 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">{edit.id ? a.common.edit : d.add}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            {(["name_ru", "name_uk", "name_en"] as const).map((key) => (
              <Field key={key} label={key === "name_ru" ? d.nameRu : key === "name_uk" ? d.nameUk : d.nameEn}>
                <input className={inputClass} value={edit.draft[key]} onChange={(e) => setEdit((c) => ({ ...c, draft: { ...c.draft, [key]: e.target.value } }))} />
              </Field>
            ))}
            <Field label={d.icon}>
              <input className={inputClass} value={edit.draft.icon} maxLength={8} onChange={(e) => setEdit((c) => ({ ...c, draft: { ...c.draft, icon: e.target.value } }))} />
            </Field>
            <Field label="Slug" hint="/category/slug">
              <input className={inputClass} value={edit.draft.slug} onChange={(e) => setEdit((c) => ({ ...c, draft: { ...c.draft, slug: e.target.value } }))} />
            </Field>
            <Field label={d.keywords}>
              <input className={inputClass} value={edit.draft.keywords} onChange={(e) => setEdit((c) => ({ ...c, draft: { ...c.draft, keywords: e.target.value } }))} />
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className={ghostButton} onClick={() => setEdit((c) => ({ ...c, open: false }))}>
              {a.common.cancel}
            </button>
            <button type="button" className={primaryButton} disabled={busy} onClick={saveDraft}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {a.common.save}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(remove)} onOpenChange={(open) => !open && !busy && setRemove(null)}>
        <DialogContent className="panel-solid border-white/10 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">{d.confirmDelete}</DialogTitle>
          </DialogHeader>
          {remove && (
            <div className="space-y-3 text-sm">
              <p className="font-semibold text-white">
                {remove.category.icon} {categoryName(remove.category, lang)}
              </p>
              {remove.category.services_count > 0 && (
                <>
                  <p className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
                    ⚠ {d.inUse}: {remove.category.services_count}
                  </p>
                  <Field label={d.reassignTo}>
                    <select className={inputClass} value={remove.target} onChange={(e) => setRemove({ ...remove, target: e.target.value })}>
                      <option value="">—</option>
                      {others.map((category) => (
                        <option key={category._id} value={category._id}>
                          {category.icon} {categoryName(category, lang)}
                        </option>
                      ))}
                      <option value="none">{d.reassignNone}</option>
                    </select>
                  </Field>
                </>
              )}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className={ghostButton} onClick={() => setRemove(null)}>
              {a.common.cancel}
            </button>
            <button
              type="button"
              className={dangerButton}
              disabled={busy || Boolean(remove && remove.category.services_count > 0 && !remove.target)}
              onClick={confirmRemove}
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {remove && remove.category.services_count > 0 ? d.deleteAndMove : a.common.delete}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
