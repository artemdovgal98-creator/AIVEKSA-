import "server-only";
import { totalumSdk } from "@/lib/totalum";

/**
 * A "suspicious" click = part of a burst of 5+ clicks from the same IP
 * inside a 10 minute window. This is a dashboard signal, not a security
 * block — nothing is ever rejected, it is only counted and listed.
 */
export interface SuspiciousGroup {
  ip: string;
  count: number;
  firstAt: string;
  lastAt: string;
}

const WINDOW_MS = 10 * 60 * 1000;
const THRESHOLD = 5;

export async function findSuspiciousClicks(sinceIso: string): Promise<{ count: number; groups: SuspiciousGroup[] }> {
  const result = await totalumSdk.crud.query("clicks", {
    _filter: { manual_entry: { ne: "yes" }, clicked_at: { gte: sinceIso } },
    _select: { ip_address: true, clicked_at: true },
    _sort: { clicked_at: "asc" },
    _limit: 5000,
  });
  if (result.errors) {
    console.error("[suspicious-clicks] query failed:", result.errors);
    return { count: 0, groups: [] };
  }

  const byIp = new Map<string, number[]>();
  for (const row of (result.data || []) as any[]) {
    const ip = String(row.ip_address || "").trim();
    if (!ip) continue;
    const ts = Date.parse(row.clicked_at || "");
    if (!Number.isFinite(ts)) continue;
    const list = byIp.get(ip);
    if (list) list.push(ts);
    else byIp.set(ip, [ts]);
  }

  let suspiciousCount = 0;
  const groups: SuspiciousGroup[] = [];
  for (const [ip, timestampsRaw] of byIp) {
    const timestamps = [...timestampsRaw].sort((a, b) => a - b);
    let windowStart = 0;
    let maxBurst = 0;
    let firstFlaggedAt = -1;
    let lastFlaggedAt = -1;
    for (let i = 0; i < timestamps.length; i++) {
      while (timestamps[i] - timestamps[windowStart] > WINDOW_MS) windowStart++;
      const windowSize = i - windowStart + 1;
      if (windowSize >= THRESHOLD) {
        maxBurst = Math.max(maxBurst, windowSize);
        if (firstFlaggedAt < 0) firstFlaggedAt = timestamps[windowStart];
        lastFlaggedAt = timestamps[i];
      }
    }
    if (maxBurst > 0) {
      suspiciousCount += maxBurst;
      groups.push({ ip, count: maxBurst, firstAt: new Date(firstFlaggedAt).toISOString(), lastAt: new Date(lastFlaggedAt).toISOString() });
    }
  }
  groups.sort((a, b) => b.count - a.count);
  return { count: suspiciousCount, groups: groups.slice(0, 50) };
}
