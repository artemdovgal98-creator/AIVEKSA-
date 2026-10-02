import "server-only";
import { readSetting } from "@/lib/settings";

/**
 * Admin-managed third-party code (ad-network verification meta tags, chat/ad widgets).
 * Stored in admin_settings; only <meta> and <script> tags are accepted and rendered.
 */
export const SITE_CODE_KEYS = { head: "site_code_head", body: "site_code_body" } as const;
export const SITE_CODE_MAX = 20_000;

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

let cache: { at: number; value: { head: string; body: string } } | null = null;

export function invalidateSiteCode() {
  cache = null;
}

export async function getSiteCode(): Promise<{ head: string; body: string }> {
  if (cache && Date.now() - cache.at < 30_000) return cache.value;
  const [head, body] = await Promise.all([readSetting(SITE_CODE_KEYS.head), readSetting(SITE_CODE_KEYS.body)]);
  const value = { head: head || "", body: body || "" };
  cache = { at: Date.now(), value };
  return value;
}
