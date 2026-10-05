/**
 * Shared (server + client) definition of the site-code slots.
 * Each slot is an independent textarea in the admin UI and an independent
 * `admin_settings` row (`site_code_<key>`), rendered into <head> or before
 * </body> depending on `scope`. Kept isolated from `@/lib/site-code` (which
 * is `server-only`) so the admin UI can import the slot list directly.
 */
export type SiteCodeScope = "head" | "body";

export interface SiteCodeSlotDef {
  key: string;
  scope: SiteCodeScope;
}

export const SITE_CODE_SLOTS: SiteCodeSlotDef[] = [
  { key: "head", scope: "head" },
  { key: "head_analytics", scope: "head" },
  { key: "head_social", scope: "head" },
  { key: "body", scope: "body" },
  { key: "body_chat", scope: "body" },
  { key: "body_ads", scope: "body" },
];

export const SITE_CODE_MAX = 20_000;

export function siteCodeSettingKey(slotKey: string): string {
  return `site_code_${slotKey}`;
}
