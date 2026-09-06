"use client";

import { useState } from "react";
import { useLang } from "@/lib/i18n/context";
import { ToolsView } from "./ToolsView";
import { ToolboxView } from "./ToolboxView";
import { Sparkles, Wrench } from "lucide-react";

/** Switches between the AI generators and the offline AI Toolbox utilities. */
export function ToolsTabs() {
  const { t } = useLang();
  const [tab, setTab] = useState<"ai" | "toolbox">("ai");

  const tabs = [
    { id: "ai" as const, label: t.toolbox.tabAi, icon: Sparkles },
    { id: "toolbox" as const, label: t.toolbox.tabToolbox, icon: Wrench },
  ];

  return (
    <div className="min-w-0 space-y-5">
      <div className="rail no-scrollbar flex">
        {tabs.map((entry) => {
          const Icon = entry.icon;
          return (
            <button
              key={entry.id}
              type="button"
              onClick={() => setTab(entry.id)}
              className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                tab === entry.id
                  ? "bg-gradient-to-r from-[#4c6fff] to-[#a855f7] text-white"
                  : "glass text-foreground/65 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" />
              {entry.label}
            </button>
          );
        })}
      </div>

      {tab === "ai" ? <ToolsView /> : <ToolboxView />}
    </div>
  );
}
