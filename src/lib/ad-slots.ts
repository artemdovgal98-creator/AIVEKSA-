import "server-only";
import { readSetting, upsertSetting } from "@/lib/settings";
import { hasDisallowedTags, parseSiteCode } from "@/lib/site-code";

/**
 * Site-wide ad zones (top/bottom network ad code + a whole-page Social Bar
 * script), configured in Admin → Ads. Stored as one JSON blob in
 * `admin_settings` (`ad_slots_config`).
 *
 * Top/bottom codes (e.g. Adsterra 300x250 / 320x50) run inside a sandboxed
 * iframe — these network codes rely on `document.write`, which would wipe out
 * the real page if executed directly after hydration. The Social Bar code is
 * a plain external/inline <script> meant to run on the real page, so it is
 * validated and rendered the same way as the Site Tags manager.
 */
export interface AdSlotsConfig {
  topEnabled: boolean;
  topCode: string;
  topMaxHeight: number;
  bottomEnabled: boolean;
  bottomCode: string;
  bottomMaxHeight: number;
  socialBarCode: string;
}

export const AD_SLOTS_KEY = "ad_slots_config";
const CODE_MAX = 20_000;

const EMPTY: AdSlotsConfig = {
  topEnabled: false,
  topCode: "",
  topMaxHeight: 250,
  bottomEnabled: false,
  bottomCode: "",
  bottomMaxHeight: 250,
  socialBarCode: "",
};

function clampHeight(value: any, fallback: number): number {
  const n = Math.trunc(Number(value));
  return Number.isFinite(n) && n >= 20 && n <= 600 ? n : fallback;
}

function normalize(input: any): AdSlotsConfig {
  return {
    topEnabled: Boolean(input?.topEnabled),
    topCode: String(input?.topCode || "").trim().slice(0, CODE_MAX),
    topMaxHeight: clampHeight(input?.topMaxHeight, EMPTY.topMaxHeight),
    bottomEnabled: Boolean(input?.bottomEnabled),
    bottomCode: String(input?.bottomCode || "").trim().slice(0, CODE_MAX),
    bottomMaxHeight: clampHeight(input?.bottomMaxHeight, EMPTY.bottomMaxHeight),
    socialBarCode: String(input?.socialBarCode || "").trim().slice(0, CODE_MAX),
  };
}

let cached: { at: number; config: AdSlotsConfig } | null = null;
const CACHE_MS = 30_000;

export function invalidateAdSlotsConfig() {
  cached = null;
}

export async function getAdSlotsConfig(): Promise<AdSlotsConfig> {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.config;
  let config = EMPTY;
  try {
    const raw = await readSetting(AD_SLOTS_KEY);
    config = raw ? normalize(JSON.parse(raw)) : EMPTY;
  } catch (err) {
    console.error("[ad-slots] unreadable setting, ads disabled:", err);
  }
  cached = { at: Date.now(), config };
  return config;
}

/** The Social Bar field only accepts <meta>/<script> — it renders directly on the real page, same rule as Site Tags. */
export function validateSocialBarCode(code: string): string | null {
  const trimmed = code.trim();
  if (!trimmed) return null;
  if (hasDisallowedTags(trimmed)) return "Разрешены только теги <meta> и <script>";
  if (parseSiteCode(trimmed).length === 0) return "Код должен содержать хотя бы один тег <meta> или <script>";
  return null;
}

export async function saveAdSlotsConfig(input: any): Promise<AdSlotsConfig> {
  const config = normalize(input);
  const socialBarError = validateSocialBarCode(config.socialBarCode);
  if (socialBarError) throw new Error(socialBarError);
  await upsertSetting(AD_SLOTS_KEY, JSON.stringify(config), "Ad network code for top/bottom slots and the site-wide Social Bar script");
  invalidateAdSlotsConfig();
  return config;
}
