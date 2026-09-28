"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export interface SystemStatus {
  appUrl: string | null;
  stripe: { configured: boolean; webhookSecret: boolean; webhookUrl: string | null; events: string[] };
  telegram: { configured: boolean; username: string | null; webhookUrl: string | null };
  zernio: { configured: boolean };
}

export function useSystemStatus() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api.get<SystemStatus>("/api/admin/system").then((response) => {
      if (!response.ok) {
        console.error("[admin/system] status failed:", response.error);
        setError(String(response.error || "error"));
      } else setStatus(response.data || null);
    });
  }, []);
  return { status, error };
}
