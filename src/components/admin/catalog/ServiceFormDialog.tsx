"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ImagePlus, Loader2, Trash2, X } from "lucide-react";
import { api } from "@/lib/api";
import { useAdminDict } from "@/lib/i18n/admin-dict";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Field, dangerButton, ghostButton, inputClass, primaryButton } from "@/components/admin/kit";

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export interface ServiceFormValue {
  title: string;
  description: string;
  official_url: string;
  partner_url: string;
  partner_enabled: boolean;
  /** Existing image preview URL (signed) — shown until replaced. */
  image_url: string;
}

type Errors = Partial<Record<"title" | "description" | "official_url" | "partner_url" | "image", string>>;

function looksLikeUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  try {
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    return (url.protocol === "http:" || url.protocol === "https:") && url.hostname.includes(".");
  } catch {
    return false;
  }
}

/**
 * Admin → AI Catalog form. EXACTLY six fields: title, description, website URL,
 * partner URL, partner toggle, image. Nothing technical lives here.
 */
export function ServiceFormDialog({
  open,
  onOpenChange,
  serviceId,
  initial,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceId: string | null;
  initial: ServiceFormValue;
  onSaved: () => void;
}) {
  const d = useAdminDict().catalog;
  const editing = Boolean(serviceId);
  const [form, setForm] = useState<ServiceFormValue>(initial);
  const [imageId, setImageId] = useState<string | null | undefined>(undefined); // undefined = unchanged
  const [preview, setPreview] = useState<string>(initial.image_url);
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const objectUrl = useRef<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm(initial);
    setPreview(initial.image_url);
    setImageId(undefined);
    setErrors({});
  }, [open, initial]);

  useEffect(() => () => {
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
  }, []);

  const set = <K extends keyof ServiceFormValue>(key: K, value: ServiceFormValue[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const validate = (): Errors => {
    const next: Errors = {};
    const title = form.title.trim();
    if (title.length < 2 || title.length > 140) next.title = d.errTitle;
    if (!form.official_url.trim()) next.official_url = d.errWebsite;
    else if (!looksLikeUrl(form.official_url)) next.official_url = d.errUrl;
    if (form.partner_url.trim() && !looksLikeUrl(form.partner_url)) next.partner_url = d.errUrl;
    if (form.partner_enabled && !form.partner_url.trim()) next.partner_url = d.errPartner;
    return next;
  };

  const pickImage = async (file: File | undefined) => {
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type) || file.size > MAX_IMAGE_BYTES) {
      setErrors((current) => ({ ...current, image: d.errImage }));
      return;
    }
    setUploading(true);
    const response = await api.upload<{ files: { name: string }[] }>("/api/admin/upload", [file]);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
    const uploaded = response.data?.files?.[0]?.name;
    if (!response.ok || !uploaded) {
      console.error("[admin/catalog] image upload failed:", response.error);
      setErrors((current) => ({ ...current, image: String(response.error || d.errImage) }));
      return;
    }
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = URL.createObjectURL(file);
    setPreview(objectUrl.current);
    setImageId(uploaded);
    setErrors((current) => ({ ...current, image: undefined }));
    console.log("[admin/catalog] image uploaded:", uploaded);
  };

  const removeImage = () => {
    setPreview("");
    setImageId(null);
  };

  const save = async () => {
    const found = validate();
    setErrors(found);
    if (Object.values(found).some(Boolean)) return;

    const body: Record<string, unknown> = {
      title: form.title.trim(),
      description: form.description.trim(),
      official_url: form.official_url.trim(),
      partner_url: form.partner_url.trim(),
      partner_enabled: form.partner_enabled,
    };
    if (imageId !== undefined) body.image = imageId;

    setSaving(true);
    const response = editing
      ? await api.put<{ _id: string }>(`/api/admin/services/${serviceId}`, body)
      : await api.post<{ _id: string }>("/api/admin/services", body);
    setSaving(false);
    if (!response.ok) {
      console.error("[admin/catalog] save failed:", response.error);
      const field = (response as any).field as keyof Errors | undefined;
      if (field) setErrors((current) => ({ ...current, [field]: String(response.error) }));
      toast.error(String(response.error || "Error"));
      return;
    }
    toast.success(editing ? d.updated : d.created);
    onOpenChange(false);
    onSaved();
  };

  const remove = async () => {
    if (!serviceId) return;
    setSaving(true);
    const response = await api.delete(`/api/admin/services/${serviceId}`);
    setSaving(false);
    setConfirmDelete(false);
    if (!response.ok) {
      console.error("[admin/catalog] delete failed:", response.error);
      toast.error(String(response.error || "Error"));
      return;
    }
    toast.success(d.deleted);
    onOpenChange(false);
    onSaved();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
        <DialogContent className="panel-solid max-h-[92vh] overflow-y-auto border-white/10 sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="font-display text-lg text-white">{editing ? d.formTitleEdit : d.formTitleNew}</DialogTitle>
            <DialogDescription className="text-xs text-foreground/45">{d.subtitle}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* 1 · Title */}
            <Field label={d.fTitle} error={errors.title}>
              <input className={inputClass} value={form.title} maxLength={140} onChange={(e) => set("title", e.target.value)} />
            </Field>

            {/* 2 · Description */}
            <Field label={d.fDescription} error={errors.description}>
              <textarea
                className={`${inputClass} min-h-[96px] resize-y`}
                value={form.description}
                maxLength={3000}
                onChange={(e) => set("description", e.target.value)}
              />
            </Field>

            {/* 3 · Ordinary website URL */}
            <Field label={d.fWebsite} error={errors.official_url}>
              <input
                className={inputClass}
                inputMode="url"
                placeholder="https://"
                value={form.official_url}
                onChange={(e) => set("official_url", e.target.value)}
              />
            </Field>

            {/* 4 · Partner / affiliate URL */}
            <Field label={d.fPartner} error={errors.partner_url}>
              <input
                className={inputClass}
                inputMode="url"
                placeholder="https://"
                value={form.partner_url}
                onChange={(e) => set("partner_url", e.target.value)}
              />
            </Field>

            {/* 5 · Partner link toggle */}
            <div className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/4 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">{d.fToggle}</p>
                <p className="mt-0.5 text-[11px] text-foreground/40">{d.fToggleHint}</p>
              </div>
              <Switch checked={form.partner_enabled} onCheckedChange={(checked) => set("partner_enabled", checked)} />
            </div>

            {/* 6 · Image upload */}
            <Field label={d.fImage} hint={d.fImageHint} error={errors.image}>
              <div className="flex items-center gap-3">
                <span className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                  {uploading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-foreground/40" />
                  ) : preview ? (
                    <img src={preview} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <ImagePlus className="h-6 w-6 text-foreground/30" />
                  )}
                </span>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className={ghostButton} disabled={uploading} onClick={(e) => { e.preventDefault(); fileRef.current?.click(); }}>
                    <ImagePlus className="h-4 w-4" />
                    {preview ? d.replace : d.upload}
                  </button>
                  {preview && (
                    <button type="button" className={ghostButton} onClick={(e) => { e.preventDefault(); removeImage(); }}>
                      <X className="h-4 w-4" />
                      {d.remove}
                    </button>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept={IMAGE_TYPES.join(",")}
                  className="hidden"
                  onChange={(e) => pickImage(e.target.files?.[0])}
                />
              </div>
            </Field>
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-white/8 pt-4">
            {editing ? (
              <button type="button" className={dangerButton} disabled={saving} onClick={() => setConfirmDelete(true)}>
                <Trash2 className="h-4 w-4" />
                {d.deleteBtn}
              </button>
            ) : (
              <button type="button" className={ghostButton} disabled={saving} onClick={() => onOpenChange(false)}>
                {d.cancelBtn}
              </button>
            )}
            <button type="button" className={primaryButton} disabled={saving || uploading} onClick={save}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? d.saveChanges : d.saveService}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent className="panel-solid border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">{d.confirmDeleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>{d.confirmDeleteText}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{d.cancelBtn}</AlertDialogCancel>
            <AlertDialogAction className="bg-rose-600 text-white hover:bg-rose-500" onClick={remove}>
              {d.deleteBtn}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
