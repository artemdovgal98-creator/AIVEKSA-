import "server-only";

/**
 * Parser for admin-provided third-party code (ad-network verification meta
 * tags, analytics snippets, chat/ad widgets). Only <meta> and <script> tags
 * are accepted and rendered — see `src/lib/site-tags.ts` for where the tags
 * themselves are stored and `src/components/site/SiteCodeTags.tsx` for how
 * they are rendered.
 */
export interface ParsedTag {
  kind: "meta" | "script";
  attrs: Record<string, string | true>;
  inline: string;
}

const ATTR_RE = /([^\s=/>"']+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
const TAG_RE = /<meta\b([^>]*?)\/?>|<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
const ANY_TAG_RE = /<[a-z][^>]*>/i;

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

/** True if anything other than a <meta> or <script> tag is present in the code. */
export function hasDisallowedTags(code: string): boolean {
  const remainder = (code || "").replace(TAG_RE, "");
  return ANY_TAG_RE.test(remainder);
}
