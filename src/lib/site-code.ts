import "server-only";
import { readSetting } from "@/lib/settings";
import { SITE_CODE_SLOTS, siteCodeSettingKey, type SiteCodeScope } from "@/lib/site-code-slots";

/**
 * Admin-managed third-party code (ad-network verification meta tags, analytics
 * snippets, chat/ad widgets). Stored in admin_settings, one row per slot (see
 * SITE_CODE_SLOTS); only <meta> and <script> tags are accepted and rendered.
 */
export interface ParsedTag {
  kind: "meta" | "script";
  attrs: Record<string, string | true>;
  inline: string;
}

const ATTR_RE = /([^\s=/>"']+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
const TAG_RE = /<meta\b([^>]*?)\/?>|<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;

function parseAttrs(raw: string): Record<string, string | true> {
  const attrs: Record<string, string | true> = {};
  for (const match of raw.matchAll(ATTR_RE)) {
    const name = match[1].toLowerCase();
    if (name.startsWith("on")) continue; // no inline event handlers
    attrs[name] = match[2] ?? match[3] ?? match[4] ?? true;
  }
  return attrs;
}

export function parseSiteCode(code: string): ParsedTag[] {
  const tags: ParsedTag[] = [];
  for (const match of (code || "").matchAll(TAG_RE)) {
    if (match[0].toLowerCase().startsWith("<meta")) tags.push({ kind: "meta", attrs: parseAttrs(match[1] || ""), inline: "" });
    else tags.push({ kind: "script", attrs: parseAttrs(match[2] || ""), inline: (match[3] || "").trim() });
  }
  return tags;
}

let cache: { at: number; value: Record<string, string> } | null = null;

export function invalidateSiteCode() {
  cache = null;
}

/** Raw code per slot key, e.g. `{ head: "...", head_analytics: "...", body_chat: "..." }`. */
export async function getSiteCode(): Promise<Record<string, string>> {
  if (cache && Date.now() - cache.at < 30_000) return cache.value;
  const entries = await Promise.all(
    SITE_CODE_SLOTS.map(async (slot) => [slot.key, (await readSetting(siteCodeSettingKey(slot.key))) || ""] as const)
  );
  const value = Object.fromEntries(entries);
  cache = { at: Date.now(), value };
  return value;
}

/** Concatenates every slot that belongs to the given scope, in declaration order. */
export function getSiteCodeByScope(code: Record<string, string>, scope: SiteCodeScope): string {
  return SITE_CODE_SLOTS.filter((slot) => slot.scope === scope)
    .map((slot) => code[slot.key] || "")
    .filter(Boolean)
    .join("\n");
}
