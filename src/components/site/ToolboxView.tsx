"use client";

import { useMemo, useRef, useState } from "react";
import { useLang } from "@/lib/i18n/context";
import { slugify } from "@/lib/localize";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  ArrowDownUp,
  Braces,
  Copy,
  Download,
  FileImage,
  FileMinus2,
  FilePlus2,
  Fingerprint,
  Image as ImageIcon,
  KeyRound,
  Link as LinkIcon,
  Loader2,
  ListX,
  Replace,
  ShieldCheck,
  Binary,
} from "lucide-react";

type ToolboxId =
  | "dedupe"
  | "sortLines"
  | "replace"
  | "slug"
  | "base64"
  | "json"
  | "password"
  | "uuid"
  | "imageConvert"
  | "imageToPdf"
  | "pdfMerge"
  | "pdfSplit";

type Group = "text" | "data" | "image" | "pdf";

const TOOLS: { id: ToolboxId; group: Group; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "dedupe", group: "text", icon: ListX },
  { id: "sortLines", group: "text", icon: ArrowDownUp },
  { id: "replace", group: "text", icon: Replace },
  { id: "slug", group: "text", icon: LinkIcon },
  { id: "base64", group: "data", icon: Binary },
  { id: "json", group: "data", icon: Braces },
  { id: "password", group: "data", icon: KeyRound },
  { id: "uuid", group: "data", icon: Fingerprint },
  { id: "imageConvert", group: "image", icon: ImageIcon },
  { id: "imageToPdf", group: "image", icon: FileImage },
  { id: "pdfMerge", group: "pdf", icon: FilePlus2 },
  { id: "pdfSplit", group: "pdf", icon: FileMinus2 },
];

const TEXT_TOOLS: ToolboxId[] = ["dedupe", "sortLines", "replace", "slug", "base64", "json"];
const FILE_TOOLS: ToolboxId[] = ["imageConvert", "imageToPdf", "pdfMerge", "pdfSplit"];

/** Reads a File into an ArrayBuffer without leaving the browser. */
function readArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error || new Error("read failed"));
    reader.readAsArrayBuffer(file);
  });
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image decode failed"));
    };
    image.src = url;
  });
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Give the browser a tick to start the download before releasing the URL.
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * AI Toolbox — free client-side utilities for text, data, images and PDF.
 *
 * Everything runs in the browser (Canvas + pdf-lib loaded on demand): no file
 * ever reaches the server, which keeps the tools free and private.
 */
export function ToolboxView() {
  const { t } = useLang();
  const tb = t.toolbox;

  const [active, setActive] = useState<ToolboxId>("dedupe");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Options shared by the different tools.
  const [search, setSearch] = useState("");
  const [replaceWith, setReplaceWith] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [b64Mode, setB64Mode] = useState<"encode" | "decode">("encode");
  const [jsonMode, setJsonMode] = useState<"beautify" | "minify">("beautify");
  const [length, setLength] = useState(16);
  const [count, setCount] = useState(5);
  const [useDigits, setUseDigits] = useState(true);
  const [useSymbols, setUseSymbols] = useState(true);
  const [imageFormat, setImageFormat] = useState<"png" | "jpeg" | "webp">("webp");
  const [quality, setQuality] = useState(85);
  const [maxWidth, setMaxWidth] = useState(1600);
  const [fromPage, setFromPage] = useState(1);
  const [toPage, setToPage] = useState(1);

  const meta = (id: ToolboxId) => tb.items[id];
  const isFileTool = FILE_TOOLS.includes(active);
  const isTextTool = TEXT_TOOLS.includes(active);

  const grouped = useMemo(() => {
    const map: Record<Group, typeof TOOLS> = { text: [], data: [], image: [], pdf: [] };
    for (const tool of TOOLS) map[tool.group].push(tool);
    return map;
  }, []);

  const select = (id: ToolboxId) => {
    setActive(id);
    setOutput("");
    setFiles([]);
    if (fileRef.current) fileRef.current.value = "";
  };

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(tb.copied);
    } catch (err) {
      console.error("[toolbox] clipboard failed:", err);
      toast.error(String(err));
    }
  };

  /* ----------------------------- text utilities ---------------------------- */

  const runText = () => {
    if (isTextTool && !input.trim()) {
      toast.error(tb.emptyInput);
      return;
    }

    try {
      switch (active) {
        case "dedupe": {
          const seen = new Set<string>();
          const lines = input.split("\n").filter((line) => {
            const key = caseSensitive ? line.trim() : line.trim().toLowerCase();
            if (!key) return false;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
          setOutput(lines.join("\n"));
          break;
        }
        case "sortLines": {
          const lines = input.split("\n").filter((line) => line.trim());
          lines.sort((a, b) => a.trim().localeCompare(b.trim(), undefined, { numeric: true }));
          if (sortDir === "desc") lines.reverse();
          setOutput(lines.join("\n"));
          break;
        }
        case "replace": {
          if (!search) {
            toast.error(tb.search);
            return;
          }
          const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const regex = new RegExp(escaped, caseSensitive ? "g" : "gi");
          setOutput(input.replace(regex, replaceWith));
          break;
        }
        case "slug": {
          setOutput(
            input
              .split("\n")
              .filter((line) => line.trim())
              .map((line) => slugify(line))
              .join("\n")
          );
          break;
        }
        case "base64": {
          if (b64Mode === "encode") {
            const bytes = new TextEncoder().encode(input);
            let binary = "";
            for (const byte of bytes) binary += String.fromCharCode(byte);
            setOutput(btoa(binary));
          } else {
            const binary = atob(input.trim());
            const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
            setOutput(new TextDecoder().decode(bytes));
          }
          break;
        }
        case "json": {
          const parsed = JSON.parse(input);
          setOutput(jsonMode === "minify" ? JSON.stringify(parsed) : JSON.stringify(parsed, null, 2));
          break;
        }
        case "password": {
          const lower = "abcdefghijkmnopqrstuvwxyz";
          const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
          const digits = "23456789";
          const symbols = "!@#$%^&*-_=+?";
          const alphabet = lower + upper + (useDigits ? digits : "") + (useSymbols ? symbols : "");
          const size = Math.min(Math.max(length, 6), 128);
          const rows: string[] = [];
          for (let index = 0; index < Math.min(Math.max(count, 1), 50); index += 1) {
            const bytes = new Uint32Array(size);
            crypto.getRandomValues(bytes);
            rows.push(Array.from(bytes, (value) => alphabet[value % alphabet.length]).join(""));
          }
          setOutput(rows.join("\n"));
          break;
        }
        case "uuid": {
          const rows: string[] = [];
          for (let index = 0; index < Math.min(Math.max(count, 1), 100); index += 1) {
            rows.push(crypto.randomUUID());
          }
          setOutput(rows.join("\n"));
          break;
        }
        default:
          break;
      }
      console.log("[toolbox] ran", active);
    } catch (err: any) {
      console.error("[toolbox] failed:", err);
      toast.error(err?.message || tb.failed);
    }
  };

  /* ----------------------------- file utilities ---------------------------- */

  const runFiles = async () => {
    if (files.length === 0) {
      toast.error(tb.pickFiles);
      return;
    }
    setBusy(true);
    try {
      if (active === "imageConvert") {
        for (const file of files) {
          const image = await loadImage(file);
          const scale = maxWidth > 0 && image.width > maxWidth ? maxWidth / image.width : 1;
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(image.width * scale);
          canvas.height = Math.round(image.height * scale);
          const context = canvas.getContext("2d");
          if (!context) throw new Error("Canvas is not available");
          context.drawImage(image, 0, 0, canvas.width, canvas.height);

          const blob: Blob | null = await new Promise((resolve) =>
            canvas.toBlob(resolve, `image/${imageFormat}`, Math.min(Math.max(quality, 1), 100) / 100)
          );
          if (!blob) throw new Error("Conversion failed");
          download(blob, `${file.name.replace(/\.[^.]+$/, "")}.${imageFormat}`);
        }
        toast.success(tb.download);
      } else {
        // pdf-lib is heavy, so it is only pulled in when a PDF tool is used.
        const { PDFDocument } = await import("pdf-lib");

        if (active === "imageToPdf") {
          const pdf = await PDFDocument.create();
          for (const file of files) {
            const bytes = new Uint8Array(await readArrayBuffer(file));
            const embedded = /png$/i.test(file.type) || /\.png$/i.test(file.name)
              ? await pdf.embedPng(bytes)
              : await pdf.embedJpg(bytes);
            const page = pdf.addPage([embedded.width, embedded.height]);
            page.drawImage(embedded, { x: 0, y: 0, width: embedded.width, height: embedded.height });
          }
          const output = await pdf.save();
          download(new Blob([output as BlobPart], { type: "application/pdf" }), "aivexa-images.pdf");
          toast.success(tb.download);
        }

        if (active === "pdfMerge") {
          const merged = await PDFDocument.create();
          for (const file of files) {
            const source = await PDFDocument.load(await readArrayBuffer(file));
            const pages = await merged.copyPages(source, source.getPageIndices());
            for (const page of pages) merged.addPage(page);
          }
          const output = await merged.save();
          download(new Blob([output as BlobPart], { type: "application/pdf" }), "aivexa-merged.pdf");
          toast.success(tb.download);
        }

        if (active === "pdfSplit") {
          const source = await PDFDocument.load(await readArrayBuffer(files[0]));
          const total = source.getPageCount();
          const start = Math.min(Math.max(fromPage, 1), total);
          const end = Math.min(Math.max(toPage, start), total);
          const target = await PDFDocument.create();
          const indices = [];
          for (let page = start - 1; page <= end - 1; page += 1) indices.push(page);
          const pages = await target.copyPages(source, indices);
          for (const page of pages) target.addPage(page);
          const output = await target.save();
          download(
            new Blob([output as BlobPart], { type: "application/pdf" }),
            `aivexa-pages-${start}-${end}.pdf`
          );
          toast.success(tb.download);
        }
      }
      console.log("[toolbox] processed", files.length, "file(s) with", active);
    } catch (err: any) {
      console.error("[toolbox] file processing failed:", err);
      toast.error(err?.message || tb.failed);
    } finally {
      setBusy(false);
    }
  };

  const accept =
    active === "imageConvert" || active === "imageToPdf" ? "image/*" : "application/pdf";

  return (
    <div className="grid min-w-0 gap-5 lg:grid-cols-[300px_1fr]">
      {/* Tool list */}
      <nav className="min-w-0 space-y-4">
        {(Object.keys(grouped) as Group[]).map((group) => (
          <div key={group} className="min-w-0">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground/40">
              {tb.groups[group]}
            </p>
            <div className="rail no-scrollbar flex lg:flex-col lg:overflow-visible">
              {grouped[group].map((tool) => {
                const Icon = tool.icon;
                const selected = active === tool.id;
                return (
                  <button
                    key={tool.id}
                    type="button"
                    onClick={() => select(tool.id)}
                    className={`flex shrink-0 items-center gap-3 rounded-2xl px-4 py-3 text-left transition-all lg:w-full ${
                      selected
                        ? "bg-gradient-to-r from-[#4c6fff]/25 to-[#a855f7]/20 ring-1 ring-[color:var(--neon-blue)]/45"
                        : "glass glass-hover"
                    }`}
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                        selected
                          ? "bg-gradient-to-br from-[#4c6fff] to-[#a855f7] text-white"
                          : "bg-white/8 text-foreground/70"
                      }`}
                    >
                      <Icon className="h-4.5 w-4.5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block whitespace-nowrap text-sm font-semibold text-white lg:whitespace-normal">
                        {meta(tool.id).name}
                      </span>
                      <span className="hidden text-xs text-foreground/45 lg:block">{meta(tool.id).desc}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Workspace */}
      <section className="glass-strong animate-fade-up min-w-0 rounded-3xl p-4 sm:p-6">
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-display break-anywhere text-lg font-bold text-white sm:text-xl">
              {meta(active).name}
            </h2>
            <p className="mt-1 break-anywhere text-sm text-foreground/55">{meta(active).desc}</p>
          </div>
          <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-400/14 px-2.5 py-1 text-[11px] font-bold text-emerald-300">
            <ShieldCheck className="h-3.5 w-3.5" />
            {tb.localOnly}
          </span>
        </header>

        {/* --- input --- */}
        {isFileTool ? (
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/20 bg-white/4 px-4 py-10 text-foreground/60 transition-colors hover:border-white/35 hover:text-white"
            >
              <Download className="h-5 w-5 rotate-180" />
              <span className="text-sm font-semibold">{tb.pickFiles}</span>
              {files.length > 0 && (
                <span className="text-xs text-foreground/45">
                  {tb.filesSelected}: {files.length}
                </span>
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept={accept}
              multiple={active !== "pdfSplit"}
              className="hidden"
              onChange={(event) => setFiles(Array.from(event.target.files || []))}
            />
          </div>
        ) : active === "password" || active === "uuid" ? null : (
          <>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-foreground/40">
              {tb.input}
            </label>
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              rows={10}
              placeholder={tb.input}
              className="w-full min-w-0 resize-y rounded-2xl bg-white/5 p-4 text-sm text-white placeholder:text-foreground/30 focus:outline-none focus:ring-1 focus:ring-[color:var(--neon-blue)]/50"
            />
          </>
        )}

        {/* --- options --- */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {active === "replace" && (
            <>
              <LabeledInput label={tb.search} value={search} onChange={setSearch} />
              <LabeledInput label={tb.replace} value={replaceWith} onChange={setReplaceWith} />
            </>
          )}
          {(active === "replace" || active === "dedupe") && (
            <Toggle label={tb.caseSensitive} on={caseSensitive} onToggle={() => setCaseSensitive((v) => !v)} />
          )}
          {active === "sortLines" && (
            <Choice
              value={sortDir}
              onChange={(value) => setSortDir(value as "asc" | "desc")}
              options={[
                { value: "asc", label: "A → Z" },
                { value: "desc", label: "Z → A" },
              ]}
            />
          )}
          {active === "base64" && (
            <Choice
              value={b64Mode}
              onChange={(value) => setB64Mode(value as "encode" | "decode")}
              options={[
                { value: "encode", label: tb.encode },
                { value: "decode", label: tb.decode },
              ]}
            />
          )}
          {active === "json" && (
            <Choice
              value={jsonMode}
              onChange={(value) => setJsonMode(value as "beautify" | "minify")}
              options={[
                { value: "beautify", label: tb.beautify },
                { value: "minify", label: tb.minify },
              ]}
            />
          )}
          {active === "password" && (
            <>
              <LabeledInput label={tb.length} value={String(length)} onChange={(v) => setLength(Number(v) || 16)} type="number" />
              <LabeledInput label={tb.count} value={String(count)} onChange={(v) => setCount(Number(v) || 1)} type="number" />
              <Toggle label={tb.digits} on={useDigits} onToggle={() => setUseDigits((v) => !v)} />
              <Toggle label={tb.symbols} on={useSymbols} onToggle={() => setUseSymbols((v) => !v)} />
            </>
          )}
          {active === "uuid" && (
            <LabeledInput label={tb.count} value={String(count)} onChange={(v) => setCount(Number(v) || 1)} type="number" />
          )}
          {active === "imageConvert" && (
            <>
              <Choice
                value={imageFormat}
                onChange={(value) => setImageFormat(value as "png" | "jpeg" | "webp")}
                options={[
                  { value: "webp", label: "WebP" },
                  { value: "jpeg", label: "JPEG" },
                  { value: "png", label: "PNG" },
                ]}
              />
              <LabeledInput label={tb.quality} value={String(quality)} onChange={(v) => setQuality(Number(v) || 85)} type="number" />
              <LabeledInput label={tb.maxWidth} value={String(maxWidth)} onChange={(v) => setMaxWidth(Number(v) || 0)} type="number" />
            </>
          )}
          {active === "pdfSplit" && (
            <>
              <LabeledInput label={tb.fromPage} value={String(fromPage)} onChange={(v) => setFromPage(Number(v) || 1)} type="number" />
              <LabeledInput label={tb.toPage} value={String(toPage)} onChange={(v) => setToPage(Number(v) || 1)} type="number" />
            </>
          )}
        </div>

        {/* --- actions --- */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button
            onClick={isFileTool ? runFiles : runText}
            disabled={busy}
            className="glow-primary h-11 rounded-xl bg-gradient-to-r from-[#4c6fff] to-[#a855f7] px-6 font-bold text-white"
          >
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {busy ? tb.working : isFileTool ? tb.download : tb.run}
          </Button>
          {(input || output || files.length > 0) && (
            <Button
              variant="ghost"
              onClick={() => {
                setInput("");
                setOutput("");
                setFiles([]);
                if (fileRef.current) fileRef.current.value = "";
              }}
              className="h-11 rounded-xl text-foreground/60"
            >
              {tb.clear}
            </Button>
          )}
        </div>

        {output && (
          <div className="mt-5 min-w-0">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-foreground/40">{tb.result}</span>
              <button
                type="button"
                onClick={() => copy(output)}
                className="flex items-center gap-1.5 rounded-lg bg-white/6 px-3 py-1.5 text-xs font-semibold text-foreground/75 transition-colors hover:bg-white/12 hover:text-white"
              >
                <Copy className="h-3.5 w-3.5" />
                {tb.copy}
              </button>
            </div>
            <pre className="glass max-h-[520px] max-w-full overflow-auto whitespace-pre-wrap break-words rounded-2xl p-4 text-sm leading-relaxed text-foreground/85">
              {output}
            </pre>
          </div>
        )}
      </section>
    </div>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div className="min-w-0">
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-foreground/45">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full min-w-0 rounded-xl bg-white/5 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[color:var(--neon-blue)]/50"
      />
    </div>
  );
}

function Toggle({ label, on, onToggle }: { label: string; on: boolean; onToggle: () => void }) {
  return (
    <label className="glass flex cursor-pointer items-center justify-between gap-3 rounded-xl px-4 py-3">
      <span className="min-w-0 truncate text-sm font-medium text-foreground/80">{label}</span>
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={on}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          on ? "bg-gradient-to-r from-[#4c6fff] to-[#a855f7]" : "bg-white/12"
        }`}
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

function Choice({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex min-w-0 flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`rounded-xl px-3.5 py-2 text-[13px] font-semibold transition-all ${
            value === option.value
              ? "bg-gradient-to-r from-[#4c6fff] to-[#a855f7] text-white"
              : "glass text-foreground/70 hover:text-white"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
