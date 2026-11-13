import "server-only";
import { totalumSdk } from "@/lib/totalum";

/**
 * Admin-managed third-party tags (verification meta tags, analytics,
 * ads/push, chat widgets). Unlike the old fixed 6-slot system, this is an
 * unlimited list stored in its own `site_tags` table. Only <meta> and
 * <script> tags are accepted (validated in the API route via `parseSiteCode`
 * from `@/lib/site-code`). Never rendered on /admin/* pages — see
 * `src/app/layout.tsx`.
 */

export const TAG_TYPES = ["verification", "analytics", "ads", "chat", "other"] as const;
export type TagType = (typeof TAG_TYPES)[number];
export type TagPlacement = "head" | "body";
export type TagScope = "all" | "home";

export interface SiteTagRecord {
  _id: string;
  name: string;
  tag_type: TagType;
  placement: TagPlacement;
  code: string;
  scope: TagScope;
  enabled: "yes" | "no";
  createdAt?: string;
  updatedAt?: string;
}

export async function listSiteTags(): Promise<SiteTagRecord[]> {
  const result = await totalumSdk.crud.query("site_tags", { _sort: { createdAt: "asc" }, _limit: 200 });
  if (result.errors) {
    console.error("[site-tags] list failed:", result.errors);
    throw new Error("Site tags query failed");
  }
  return (result.data || []) as unknown as SiteTagRecord[];
}

let cache: { at: number; value: SiteTagRecord[] } | null = null;
const CACHE_MS = 30_000;

export function invalidateSiteTags() {
  cache = null;
}

/** Enabled tags only, cached briefly so every page render doesn't pay for it. */
export async function getActiveSiteTags(): Promise<SiteTagRecord[]> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.value;
  const all = await listSiteTags();
  const value = all.filter((tag) => tag.enabled === "yes");
  cache = { at: Date.now(), value };
  return value;
}

/** Tags that apply to this placement + page, in declaration order. */
export function tagsForRequest(tags: SiteTagRecord[], placement: TagPlacement, pathname: string): SiteTagRecord[] {
  const isHome = pathname === "/";
  return tags.filter((tag) => tag.placement === placement && (tag.scope === "all" || isHome));
}
