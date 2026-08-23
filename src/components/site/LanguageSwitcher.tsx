"use client";

import { useLang } from "@/lib/i18n/context";
import { LANGS } from "@/lib/i18n/dictionaries";
import { useSession } from "@/lib/auth-client";
import { api } from "@/lib/api";
import type { Lang } from "@/lib/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe, Check } from "lucide-react";

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { lang, setLang } = useLang();
  const { data: session } = useSession();
  const current = LANGS.find((entry) => entry.code === lang) || LANGS[0];

  const handleChange = async (next: Lang) => {
    if (next === lang) return;
    setLang(next);
    if (session?.user) {
      const response = await api.put("/api/me", { language: next });
      if (!response.ok) console.error("[lang] failed to persist language:", response.error);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Language"
          className="glass glass-hover flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-foreground/90"
        >
          <Globe className="h-4 w-4 text-[color:var(--neon-cyan)]" />
          <span className="hidden sm:inline">{current.flag}</span>
          {!compact && <span className="uppercase tracking-wide">{current.code}</span>}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="panel-solid min-w-48 space-y-1 rounded-2xl p-2">
        {LANGS.map((entry) => (
          <DropdownMenuItem
            key={entry.code}
            onClick={() => handleChange(entry.code)}
            className="flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium focus:bg-white/10"
          >
            <span className="text-base">{entry.flag}</span>
            <span className="flex-1">{entry.label}</span>
            {entry.code === lang && <Check className="h-4 w-4 text-[color:var(--neon-cyan)]" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
