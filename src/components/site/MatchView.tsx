"use client";

import { useState } from "react";
import { useLang } from "@/lib/i18n/context";
import { api } from "@/lib/api";
import { ServiceCard } from "./ServiceCard";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, Wand2 } from "lucide-react";
import type { ServiceRecord } from "@/lib/types";

interface Match {
  service: ServiceRecord;
  score: number;
}

export function MatchView({ initialTask = "" }: { initialTask?: string }) {
  const { t } = useLang();
  const [task, setTask] = useState(initialTask);
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);

    const response = await api.post<Match[]>("/api/match", { task: trimmed });
    if (!response.ok) {
      console.error("[match] request failed:", response.error);
      setError(String(response.error || "error"));
      setMatches([]);
    } else {
      setMatches(response.data || []);
    }
    setLoading(false);
  };

  const examples = t.home.examples;

  return (
    <div className="space-y-6">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          run(task);
        }}
        className="glass-strong animate-fade-up rounded-3xl p-4 sm:p-6"
      >
        <textarea
          value={task}
          onChange={(event) => setTask(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              run(task);
            }
          }}
          rows={3}
          placeholder={t.match.placeholder}
          className="w-full resize-none bg-transparent text-base text-white placeholder:text-foreground/35 focus:outline-none sm:text-lg"
        />
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="hidden text-xs text-foreground/35 sm:block">⌘ + Enter</p>
          <Button
            type="submit"
            disabled={loading || !task.trim()}
            className="glow-primary ml-auto h-12 rounded-2xl bg-gradient-to-r from-[#4c6fff] via-[#7c5cff] to-[#a855f7] px-7 text-base font-bold text-white"
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
            {loading ? t.match.thinking : t.match.button}
          </Button>
        </div>
      </form>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground/40">
          {t.match.examples}
        </p>
        <div className="flex flex-wrap gap-2">
          {examples.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => {
                setTask(example);
                run(example);
              }}
              className="glass glass-hover rounded-xl px-3 py-2 text-[13px] text-foreground/70 hover:text-white"
            >
              {example}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="rounded-xl bg-rose-500/12 px-4 py-3 text-sm text-rose-300">{error}</p>
      )}

      {matches !== null && !loading && (
        <section>
          {matches.length === 0 ? (
            <div className="glass rounded-2xl px-6 py-14 text-center">
              <p className="text-sm text-foreground/60">{t.match.empty}</p>
            </div>
          ) : (
            <>
              <h2 className="font-display mb-4 flex items-center gap-2 text-lg font-bold text-white">
                <Sparkles className="h-4.5 w-4.5 text-[color:var(--neon-cyan)]" />
                {t.match.results}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {matches.map((match, index) => (
                  <ServiceCard
                    key={match.service._id}
                    service={match.service}
                    score={match.score}
                    delay={index * 45}
                  />
                ))}
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
