"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Loader2, Upload, X } from "lucide-react";
import { MAX_UPLOAD_BYTES, type TotalumFile } from "@/lib/types";

/**
 * Upload widget for a Totalum file field.
 *
 * The value is always the COMPLETE list of files to keep — removing a thumbnail
 * and saving is what deletes it from the record. Existing files carry a signed
 * `url`; freshly uploaded ones are previewed from a local object URL until the
 * record is reloaded.
 */
export function FileField({
  value,
  onChange,
  max = 1,
  endpoint = "/api/admin/upload",
  label,
  hint,
  disabled = false,
}: {
  value: TotalumFile[];
  onChange: (next: TotalumFile[]) => void;
  max?: number;
  endpoint?: string;
  label: string;
  hint?: string;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [previews, setPreviews] = useState<Record<string, string>>({});

  // Object URLs are revoked on unmount so the tab does not leak memory.
  useEffect(() => {
    return () => {
      for (const url of Object.values(previews)) URL.revokeObjectURL(url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pick = () => inputRef.current?.click();

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);

    const room = max - value.length;
    if (room <= 0) {
      toast.error(`Максимум ${max}`);
      return;
    }
    const accepted = files.slice(0, room);

    const tooBig = accepted.find((file) => file.size > MAX_UPLOAD_BYTES);
    if (tooBig) {
      toast.error(`"${tooBig.name}" больше 10 МБ`);
      return;
    }

    setBusy(true);
    const response = await api.upload<{ files: { name: string; originalName: string }[] }>(endpoint, accepted);
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";

    if (!response.ok) {
      console.error("[file-field] upload failed:", response.error);
      toast.error(String(response.error || "Upload failed"));
      return;
    }

    const uploaded = response.data?.files || [];
    const nextPreviews: Record<string, string> = {};
    uploaded.forEach((entry, index) => {
      const file = accepted[index];
      if (file && file.type.startsWith("image/")) nextPreviews[entry.name] = URL.createObjectURL(file);
    });
    setPreviews((current) => ({ ...current, ...nextPreviews }));
    onChange([...value, ...uploaded.map((entry) => ({ name: entry.name }))].slice(0, max));
    console.log("[file-field] linked", uploaded.length, "file(s)");
  };

  const remove = (name: string) => onChange(value.filter((entry) => entry.name !== name));

  return (
    <div className="min-w-0">
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-foreground/45">
        {label}
      </label>

      <div className="flex flex-wrap gap-2">
        {value.map((entry) => {
          const src = entry.url || previews[entry.name] || "";
          return (
            <span
              key={entry.name}
              className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border border-white/12 bg-white/5"
            >
              {src ? (
                <img src={src} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="px-1 text-center text-[10px] leading-tight text-foreground/45">OK</span>
              )}
              <button
                type="button"
                onClick={() => remove(entry.name)}
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white hover:bg-rose-500"
                aria-label="remove"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          );
        })}

        {value.length < max && (
          <button
            type="button"
            onClick={pick}
            disabled={busy || disabled}
            className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-white/20 bg-white/4 text-foreground/55 transition-colors hover:border-white/35 hover:text-white disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            <span className="text-[10px] font-semibold">
              {value.length}/{max}
            </span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={max > 1}
        className="hidden"
        onChange={(event) => handleFiles(event.target.files)}
      />

      <p className="mt-1 text-[11px] text-foreground/35">{hint || `До ${max} файлов, максимум 10 МБ каждый`}</p>
    </div>
  );
}
