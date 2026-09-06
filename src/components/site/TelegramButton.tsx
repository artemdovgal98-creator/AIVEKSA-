"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Send } from "lucide-react";

interface BotInfo {
  configured: boolean;
  username: string;
  url: string;
}

/**
 * "Open in Telegram" button. It reads the bot handle the owner bound in the
 * admin panel, so it always points at the live bot — and hides itself while no
 * bot is connected instead of linking nowhere.
 */
export function TelegramButton({
  variant = "compact",
  label,
  className = "",
}: {
  variant?: "compact" | "full";
  label?: string;
  className?: string;
}) {
  const [bot, setBot] = useState<BotInfo | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.get<BotInfo>("/api/telegram/bot").then((response) => {
      if (cancelled) return;
      if (!response.ok) {
        console.error("[telegram-button] failed to load bot info:", response.error);
        return;
      }
      setBot(response.data || null);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!bot?.configured || !bot.url) return null;

  if (variant === "compact") {
    return (
      <a
        href={bot.url}
        target="_blank"
        rel="noopener noreferrer"
        title={`@${bot.username}`}
        aria-label={`@${bot.username}`}
        className={`flex h-10 w-10 items-center justify-center rounded-full bg-[#229ED9] text-white transition-transform hover:scale-105 ${className}`}
      >
        <Send className="h-4.5 w-4.5" />
      </a>
    );
  }

  return (
    <a
      href={bot.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex max-w-full items-center justify-center gap-2 rounded-xl bg-[#229ED9] px-4 py-3 text-sm font-bold text-white transition-transform hover:scale-[1.02] ${className}`}
    >
      <Send className="h-4 w-4 shrink-0" />
      <span className="truncate">{label || `@${bot.username}`}</span>
    </a>
  );
}
