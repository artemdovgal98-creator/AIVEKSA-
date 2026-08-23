"use client";

import { useMemo, useState } from "react";
import { useLang } from "@/lib/i18n/context";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  AlignLeft,
  Copy,
  Hash,
  Lightbulb,
  Loader2,
  MessageSquare,
  Pencil,
  Ruler,
  Sparkles,
  Tag,
  Type,
  Wand2,
} from "lucide-react";

type AiToolId = "ideas" | "prompts" | "improve" | "names" | "descriptions" | "posts" | "hashtags";
type ToolId = AiToolId | "words" | "chars" | "format";

const AI_TOOLS: AiToolId[] = ["ideas", "prompts", "improve", "names", "descriptions", "posts", "hashtags"];

const ICONS: Record<ToolId, React.ComponentType<{ className?: string }>> = {
  ideas: Lightbulb,
  prompts: Wand2,
  improve: Pencil,
  names: Sparkles,
  descriptions: AlignLeft,
  posts: MessageSquare,
  hashtags: Hash,
  words: Type,
  chars: Ruler,
  format: Tag,
};

const ORDER: ToolId[] = [
  "ideas",
  "prompts",
  "improve",
  "names",
  "descriptions",
  "posts",
  "hashtags",
  "words",
  "chars",
  "format",
];

type FormatOp = "clean" | "upper" | "lower" | "sentence" | "title" | "bullets" | "numbered" | "removeLines";

function applyFormat(text: string, op: FormatOp): string {
  switch (op) {
    case "clean":
      return text.replace(/[ \t]+/g, " ").replace(/ ?\n ?/g, "\n").trim();
    case "upper":
      return text.toUpperCase();
    case "lower":
      return text.toLowerCase();
    case "sentence":
      return text
        .toLowerCase()
        .replace(/(^\s*\p{L}|[.!?]\s+\p{L})/gu, (match) => match.toUpperCase());
    case "title":
      return text.replace(/\p{L}[\p{L}'’-]*/gu, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
    case "bullets":
      return text
        .split("\n")
        .filter((line) => line.trim())
        .map((line) => `• ${line.trim().replace(/^[•\-*]\s*/, "")}`)
        .join("\n");
    case "numbered":
      return text
        .split("\n")
        .filter((line) => line.trim())
        .map((line, index) => `${index + 1}. ${line.trim().replace(/^\d+\.\s*/, "")}`)
        .join("\n");
    case "removeLines":
      return text
        .split("\n")
        .filter((line) => line.trim())
        .join("\n");
    default:
      return text;
  }
}

function textStats(text: string) {
  const trimmed = text.trim();
  const words = trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0;
  const chars = text.length;
  const charsNoSpaces = text.replace(/\s/g, "").length;
  const sentences = trimmed ? (trimmed.match(/[^.!?…]+[.!?…]+|[^.!?…]+$/g) || []).length : 0;
  const paragraphs = trimmed ? trimmed.split(/\n{2,}/).filter((block) => block.trim()).length : 0;
  const readTime = Math.max(words > 0 ? 1 : 0, Math.round(words / 200));
  return { words, chars, charsNoSpaces, sentences, paragraphs, readTime };
}

export function ToolsView() {
  const { lang, t } = useLang();
  const [active, setActive] = useState<ToolId>("ideas");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);

  const stats = useMemo(() => textStats(input), [input]);
  const isAi = AI_TOOLS.includes(active as AiToolId);

  const meta = (id: ToolId) => t.tools[id] as { name: string; desc: string };

  const selectTool = (id: ToolId) => {
    setActive(id);
    setOutput("");
  };

  const generate = async () => {
    if (!input.trim()) {
      toast.error(t.tools.emptyInput);
      return;
    }
    setLoading(true);
    setOutput("");

    const response = await api.post<{ text: string }>("/api/tools/generate", {
      tool: active,
      input: input.trim(),
      lang,
    });

    if (!response.ok) {
      console.error("[tools] generation failed:", response.error);
      toast.error(String(response.error || "error"));
    } else {
      setOutput(response.data?.text || "");
    }
    setLoading(false);
  };

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(t.tools.copied);
    } catch (err) {
      console.error("[tools] clipboard failed:", err);
    }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
      {/* Tool list */}
      <nav className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
        {ORDER.map((id) => {
          const Icon = ICONS[id];
          const info = meta(id);
          const selected = active === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => selectTool(id)}
              className={`flex shrink-0 items-center gap-3 rounded-2xl px-4 py-3 text-left transition-all lg:w-full ${
                selected
                  ? "bg-gradient-to-r from-[#4c6fff]/25 to-[#a855f7]/20 ring-1 ring-[color:var(--neon-blue)]/45"
                  : "glass glass-hover"
              }`}
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                  selected ? "bg-gradient-to-br from-[#4c6fff] to-[#a855f7] text-white" : "bg-white/8 text-foreground/70"
                }`}
              >
                <Icon className="h-4.5 w-4.5" />
              </span>
              <span className="min-w-0">
                <span className="block whitespace-nowrap text-sm font-semibold text-white lg:whitespace-normal">
                  {info.name}
                </span>
                <span className="hidden text-xs text-foreground/45 lg:block">{info.desc}</span>
              </span>
            </button>
          );
        })}
      </nav>

      {/* Workspace */}
      <section className="glass-strong animate-fade-up min-w-0 rounded-3xl p-4 sm:p-6">
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold text-white sm:text-xl">{meta(active).name}</h2>
            <p className="mt-1 text-sm text-foreground/55">{meta(active).desc}</p>
          </div>
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${
              isAi ? "bg-[color:var(--neon-violet)]/20 text-[#d8b4fe]" : "bg-emerald-400/14 text-emerald-300"
            }`}
          >
            {isAi ? t.tools.aiPowered : t.tools.instant}
          </span>
        </header>

        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-foreground/40">
          {t.tools.input}
        </label>
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          rows={active === "improve" || active === "format" || !isAi ? 10 : 4}
          placeholder={t.tools.input}
          className="w-full resize-y rounded-2xl bg-white/5 p-4 text-sm text-white placeholder:text-foreground/30 focus:outline-none focus:ring-1 focus:ring-[color:var(--neon-blue)]/50"
        />

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {isAi && (
            <Button
              onClick={generate}
              disabled={loading}
              className="glow-primary h-11 rounded-xl bg-gradient-to-r from-[#4c6fff] to-[#a855f7] px-6 font-bold text-white"
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              {loading ? t.tools.working : t.tools.generate}
            </Button>
          )}
          {input && (
            <Button
              variant="ghost"
              onClick={() => {
                setInput("");
                setOutput("");
              }}
              className="h-11 rounded-xl text-foreground/60"
            >
              {t.tools.clear}
            </Button>
          )}
        </div>

        {/* Instant text statistics */}
        {(active === "words" || active === "chars") && (
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {(
              [
                ["words", stats.words],
                ["chars", stats.chars],
                ["charsNoSpaces", stats.charsNoSpaces],
                ["sentences", stats.sentences],
                ["paragraphs", stats.paragraphs],
              ] as const
            ).map(([key, value]) => (
              <div key={key} className="glass rounded-2xl px-4 py-3">
                <p className="font-display text-2xl font-extrabold text-white">{value}</p>
                <p className="mt-0.5 text-xs text-foreground/45">{t.tools.stats[key]}</p>
              </div>
            ))}
            <div className="glass rounded-2xl px-4 py-3">
              <p className="font-display text-2xl font-extrabold text-white">
                {stats.readTime} <span className="text-sm font-semibold text-foreground/50">{t.tools.minutes}</span>
              </p>
              <p className="mt-0.5 text-xs text-foreground/45">{t.tools.stats.readTime}</p>
            </div>
          </div>
        )}

        {/* Formatting operations */}
        {active === "format" && (
          <div className="mt-5 flex flex-wrap gap-2">
            {(Object.keys(t.tools.formatOps) as FormatOp[]).map((op) => (
              <button
                key={op}
                type="button"
                onClick={() => setOutput(applyFormat(input, op))}
                className="glass glass-hover rounded-xl px-3 py-2 text-[13px] font-medium text-foreground/75 hover:text-white"
              >
                {t.tools.formatOps[op]}
              </button>
            ))}
          </div>
        )}

        {output && (
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-foreground/40">
                {t.tools.result}
              </span>
              <button
                type="button"
                onClick={() => copy(output)}
                className="flex items-center gap-1.5 rounded-lg bg-white/6 px-3 py-1.5 text-xs font-semibold text-foreground/75 transition-colors hover:bg-white/12 hover:text-white"
              >
                <Copy className="h-3.5 w-3.5" />
                {t.tools.copy}
              </button>
            </div>
            <pre className="glass max-h-[520px] overflow-auto whitespace-pre-wrap break-words rounded-2xl p-4 text-sm leading-relaxed text-foreground/85">
              {output}
            </pre>
          </div>
        )}
      </section>
    </div>
  );
}
