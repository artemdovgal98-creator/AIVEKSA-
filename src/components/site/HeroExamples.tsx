"use client";

import { useRouter } from "next/navigation";
import { useLang } from "@/lib/i18n/context";

/** Clickable example queries under the hero search. */
export function HeroExamples() {
  const { t } = useLang();
  const router = useRouter();

  return (
    <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
      {t.home.examples.map((example) => (
        <button
          key={example}
          type="button"
          onClick={() => router.push(`/catalog?q=${encodeURIComponent(example)}`)}
          className="glass rounded-full px-3 py-1.5 text-xs font-medium text-foreground/70 transition-all hover:border-white/25 hover:text-white sm:text-[13px]"
        >
          {example}
        </button>
      ))}
    </div>
  );
}
