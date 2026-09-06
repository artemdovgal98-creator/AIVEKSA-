"use client";

import { useCallback, useEffect, useState } from "react";
import { useLang } from "@/lib/i18n/context";
import { api } from "@/lib/api";
import { categoryName } from "@/lib/localize";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { FileField } from "./FileField";
import { Loader2, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import type { CategoryRecord, ServiceRecord, TotalumFile } from "@/lib/types";

export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "select"
  | "toggle"
  | "url"
  | "date"
  | "files";

export interface AdminField {
  key: string;
  label: string;
  type: FieldType;
  options?: { value: string; label: string }[];
  optionsSource?: "categories" | "services";
  placeholder?: string;
  full?: boolean;
  rows?: number;
  step?: string;
  hint?: string;
  /** `files` only — how many uploads the field accepts. */
  max?: number;
  /** `files` only — upload endpoint, defaults to the admin one. */
  uploadEndpoint?: string;
}

/** Normalises a Totalum file field (single or multiple) into an editable list. */
function toFileList(value: any): TotalumFile[] {
  if (!value) return [];
  const list = Array.isArray(value) ? value : [value];
  return list
    .map((entry: any) => (typeof entry === "string" ? { name: entry } : entry))
    .filter((entry: any) => entry && typeof entry.name === "string");
}

export interface AdminCrudProps<T> {
  endpoint: string;
  fields: AdminField[];
  empty: Record<string, any>;
  renderRow: (record: T) => React.ReactNode;
  newLabel: string;
  editLabel: string;
  searchable?: boolean;
  /** Extra quick actions rendered next to edit/delete. */
  renderActions?: (record: T, reload: () => void) => React.ReactNode;
}

export function AdminCrud<T extends { _id: string }>({
  endpoint,
  fields,
  empty,
  renderRow,
  newLabel,
  editLabel,
  searchable = false,
  renderActions,
}: AdminCrudProps<T>) {
  const { lang, t } = useLang();
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [editing, setEditing] = useState<Record<string, any> | null>(null);
  const [saving, setSaving] = useState(false);

  const needsCategories = fields.some((field) => field.optionsSource === "categories");
  const needsServices = fields.some((field) => field.optionsSource === "services");

  const load = useCallback(async () => {
    setLoading(true);
    const url = searchable && query.trim() ? `${endpoint}?q=${encodeURIComponent(query.trim())}` : endpoint;
    const response = await api.get<T[]>(url);
    if (!response.ok) {
      console.error(`[admin] failed to load ${endpoint}:`, response.error);
      toast.error(String(response.error || t.common.error));
      setItems([]);
    } else {
      setItems(response.data || []);
    }
    setLoading(false);
  }, [endpoint, query, searchable, t.common.error]);

  useEffect(() => {
    const timer = setTimeout(load, query ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load, query]);

  useEffect(() => {
    if (!needsCategories) return;
    api.get<CategoryRecord[]>("/api/categories").then((response) => {
      if (!response.ok) {
        console.error("[admin] failed to load categories:", response.error);
        return;
      }
      setCategories(response.data || []);
    });
  }, [needsCategories]);

  useEffect(() => {
    if (!needsServices) return;
    api.get<ServiceRecord[]>("/api/admin/services").then((response) => {
      if (!response.ok) {
        console.error("[admin] failed to load services:", response.error);
        return;
      }
      setServices(response.data || []);
    });
  }, [needsServices]);

  const openNew = () => setEditing({ ...empty });

  const openEdit = (record: any) => {
    const draft: Record<string, any> = { _id: record._id };
    for (const field of fields) {
      const value = record[field.key];
      if (field.type === "files") {
        draft[field.key] = toFileList(value);
        continue;
      }
      if (field.type === "date") {
        // <input type="date"> only accepts YYYY-MM-DD, the DB stores a full ISO date.
        draft[field.key] = typeof value === "string" ? value.slice(0, 10) : "";
        continue;
      }
      const isRelation = field.optionsSource === "categories" || field.optionsSource === "services";
      draft[field.key] =
        isRelation && value && typeof value === "object" ? value._id : value ?? empty[field.key] ?? "";
    }
    setEditing(draft);
  };

  const save = async () => {
    if (!editing) return;
    setSaving(true);

    const { _id, ...payload } = editing;
    const response = _id
      ? await api.put(`${endpoint}/${_id}`, payload)
      : await api.post(endpoint, payload);

    if (!response.ok) {
      console.error("[admin] save failed:", response.error);
      toast.error(typeof response.error === "string" ? response.error : JSON.stringify(response.error));
      setSaving(false);
      return;
    }

    toast.success(t.admin.form.saved);
    setSaving(false);
    setEditing(null);
    load();
  };

  const remove = async (record: T) => {
    if (!window.confirm(t.admin.form.confirmDelete)) return;
    const response = await api.delete(`${endpoint}/${record._id}`);
    if (!response.ok) {
      console.error("[admin] delete failed:", response.error);
      toast.error(String(response.error || t.common.error));
      return;
    }
    toast.success(t.admin.form.deleted);
    load();
  };

  const optionsFor = (field: AdminField) => {
    if (field.optionsSource === "categories") {
      return categories.map((category) => ({
        value: category._id,
        label: `${category.icon || ""} ${categoryName(category, lang)}`.trim(),
      }));
    }
    if (field.optionsSource === "services") {
      return services.map((service) => ({ value: service._id, label: service.name }));
    }
    return field.options || [];
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        {searchable && (
          <div className="glass flex min-w-[220px] flex-1 items-center gap-2 rounded-xl px-3.5 py-2.5">
            <Search className="h-4 w-4 shrink-0 text-foreground/40" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t.common.search}
              className="w-full bg-transparent text-sm text-white placeholder:text-foreground/30 focus:outline-none"
            />
          </div>
        )}
        <Button
          onClick={openNew}
          className="ml-auto h-11 rounded-xl bg-gradient-to-r from-[#4c6fff] to-[#a855f7] font-semibold text-white"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          {newLabel}
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="glass h-16 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="glass rounded-2xl px-6 py-14 text-center text-sm text-foreground/50">
          {t.admin.stats.noData}
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((record) => (
            <div
              key={record._id}
              className="glass flex flex-wrap items-center gap-3 rounded-2xl px-4 py-3 sm:flex-nowrap"
            >
              <div className="min-w-0 flex-1">{renderRow(record)}</div>
              <div className="flex shrink-0 items-center gap-1.5">
                {renderActions?.(record, load)}
                <button
                  type="button"
                  onClick={() => openEdit(record)}
                  title={t.common.edit}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/6 text-foreground/70 transition-colors hover:bg-white/12 hover:text-white"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => remove(record)}
                  title={t.common.delete}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10 text-rose-300 transition-colors hover:bg-rose-500/20"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Editor */}
      {editing && (
        <div className="scrim fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6">
          <div className="panel-solid max-h-[92vh] w-full max-w-3xl overflow-y-auto overflow-x-hidden rounded-t-3xl p-5 sm:rounded-3xl sm:p-7">
            <div className="mb-5 flex items-center justify-between gap-3">
              <h2 className="font-display text-lg font-bold text-white">
                {editing._id ? editLabel : newLabel}
              </h2>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/6 text-foreground/70 hover:bg-white/12 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                save();
              }}
              className="grid gap-4 sm:grid-cols-2"
            >
              {fields.map((field) => {
                const value = editing[field.key];
                const setValue = (next: any) => setEditing({ ...editing, [field.key]: next });

                if (field.type === "files") {
                  return (
                    <div key={field.key} className={field.full ? "sm:col-span-2" : ""}>
                      <FileField
                        label={field.label}
                        hint={field.hint}
                        max={field.max || 1}
                        endpoint={field.uploadEndpoint || "/api/admin/upload"}
                        value={toFileList(value)}
                        onChange={(next) => setValue(next)}
                      />
                    </div>
                  );
                }

                if (field.type === "toggle") {
                  const on = value === "yes" || value === true;
                  return (
                    <label
                      key={field.key}
                      className="glass flex cursor-pointer items-center justify-between gap-3 rounded-xl px-4 py-3"
                    >
                      <span className="text-sm font-medium text-foreground/80">{field.label}</span>
                      <button
                        type="button"
                        onClick={() => setValue(on ? "no" : "yes")}
                        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                          on ? "bg-gradient-to-r from-[#4c6fff] to-[#a855f7]" : "bg-white/12"
                        }`}
                        aria-pressed={on}
                      >
                        <span
                          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                            on ? "translate-x-5.5" : "translate-x-0.5"
                          }`}
                        />
                      </button>
                    </label>
                  );
                }

                return (
                  <div key={field.key} className={field.full || field.type === "textarea" ? "sm:col-span-2" : ""}>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-foreground/45">
                      {field.label}
                    </label>

                    {field.type === "textarea" ? (
                      <textarea
                        value={value ?? ""}
                        onChange={(event) => setValue(event.target.value)}
                        rows={field.rows || 4}
                        placeholder={field.placeholder}
                        className="w-full resize-y rounded-xl bg-white/5 px-4 py-3 text-sm text-white placeholder:text-foreground/25 focus:outline-none focus:ring-1 focus:ring-[color:var(--neon-blue)]/50"
                      />
                    ) : field.type === "select" ? (
                      <select
                        value={value ?? ""}
                        onChange={(event) => setValue(event.target.value)}
                        className="w-full rounded-xl bg-white/5 px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[color:var(--neon-blue)]/50"
                      >
                        <option value="" className="bg-[#161626]">
                          —
                        </option>
                        {optionsFor(field).map((option) => (
                          <option key={option.value} value={option.value} className="bg-[#161626]">
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={
                          field.type === "number"
                            ? "number"
                            : field.type === "url"
                              ? "url"
                              : field.type === "date"
                                ? "date"
                                : "text"
                        }
                        step={field.step}
                        value={value ?? ""}
                        onChange={(event) =>
                          setValue(field.type === "number" ? event.target.value : event.target.value)
                        }
                        placeholder={field.placeholder}
                        className="w-full rounded-xl bg-white/5 px-4 py-3 text-sm text-white placeholder:text-foreground/25 focus:outline-none focus:ring-1 focus:ring-[color:var(--neon-blue)]/50"
                      />
                    )}

                    {field.hint && <p className="mt-1 text-[11px] text-foreground/35">{field.hint}</p>}
                  </div>
                );
              })}

              <div className="panel-solid sticky bottom-0 -mx-5 mt-2 flex flex-wrap gap-3 rounded-t-2xl border-x-0 border-b-0 px-5 py-4 sm:col-span-2 sm:mx-0 sm:rounded-none sm:border-0 sm:bg-transparent sm:px-0 sm:backdrop-blur-none">
                <Button
                  type="submit"
                  disabled={saving}
                  className="glow-primary h-12 flex-1 rounded-xl bg-gradient-to-r from-[#4c6fff] to-[#a855f7] font-bold text-white"
                >
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t.common.save}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setEditing(null)}
                  className="h-12 rounded-xl text-foreground/60"
                >
                  {t.common.cancel}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
