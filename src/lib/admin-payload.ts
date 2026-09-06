import { slugify } from "@/lib/localize";
import {
  AFFILIATE_STATUSES,
  MAX_PROFILE_PHOTOS,
  MAX_SERVICE_LOGOS,
  PAYOUT_MODELS,
  PROFILE_LINK_FIELDS,
  PROFILE_TEXT_FIELDS,
  RADAR_IMPORTANCES,
  RADAR_TYPES,
  toFileLinks,
} from "@/lib/types";

const YES_NO = (value: any, fallback: "yes" | "no" = "no"): "yes" | "no" =>
  value === "yes" || value === true ? "yes" : value === "no" || value === false ? "no" : fallback;

const str = (value: any): string => (typeof value === "string" ? value.trim() : "");

const num = (value: any, fallback = 0): number => {
  const parsed = typeof value === "number" ? value : parseFloat(String(value ?? ""));
  return Number.isFinite(parsed) ? parsed : fallback;
};

/** Keys of a service that are plain trimmed strings. */
const SERVICE_TEXT_FIELDS = [
  "logo_url", "official_url", "affiliate_url", "affiliate_program_url", "affiliate_network",
  "commission", "affiliate_notes", "pricing", "tags", "keywords",
  "title_ru", "title_uk", "title_en",
  "description_ru", "description_uk", "description_en",
  "features_ru", "features_uk", "features_en",
  "pros_ru", "pros_uk", "pros_en",
  "cons_ru", "cons_uk", "cons_en",
] as const;

/** Yes/no switches of a service with the default used when a record is created. */
const SERVICE_FLAG_FIELDS: [string, "yes" | "no"][] = [
  ["is_affiliate", "no"],
  ["free_plan", "no"],
  ["featured", "no"],
  ["popular", "no"],
  ["active", "yes"],
];

/**
 * Whitelists the fields an admin may write to a service — no mass assignment.
 *
 * PARTIAL BY DESIGN: only the keys the client actually submitted are written.
 * The service edit card shows a short form, so anything it does not send
 * (features, pros/cons, tags, pricing…) must keep its stored value.
 */
export function buildServicePayload(body: any, mode: "create" | "update" = "update") {
  const source = body || {};
  const has = (key: string) => Object.prototype.hasOwnProperty.call(source, key);
  const payload: Record<string, any> = {};

  const name = str(source.name);
  if (has("name")) payload.name = name;
  if (has("slug") || mode === "create") payload.slug = str(source.slug) || slugify(name);
  // `null` unbinds the relation, an absent key leaves it untouched.
  if (has("category")) payload.category = str(source.category) || null;

  for (const key of SERVICE_TEXT_FIELDS) if (has(key)) payload[key] = str(source[key]);
  for (const [key, fallback] of SERVICE_FLAG_FIELDS) if (has(key)) payload[key] = YES_NO(source[key], fallback);

  if (has("pricing_type")) {
    payload.pricing_type = ["free", "freemium", "paid"].includes(source.pricing_type)
      ? source.pricing_type
      : "freemium";
  }
  if (has("rating")) payload.rating = Math.min(Math.max(num(source.rating, 0), 0), 5);
  if (has("popularity")) payload.popularity = Math.max(num(source.popularity, 0), 0);

  // Custom logos: the client posts the complete list it wants to keep.
  if (has("logo_files")) payload.logo_files = toFileLinks(source.logo_files, MAX_SERVICE_LOGOS);

  // Only overwrite the affiliate status when a valid one was submitted —
  // an ordinary service edit must not silently reset it.
  if (AFFILIATE_STATUSES.includes(source.affiliate_status)) payload.affiliate_status = source.affiliate_status;

  if (mode === "create") {
    for (const [key, fallback] of SERVICE_FLAG_FIELDS) if (!has(key)) payload[key] = fallback;
    if (!has("pricing_type")) payload.pricing_type = "freemium";
  }

  return payload;
}

export function buildCategoryPayload(body: any) {
  const nameRu = str(body.name_ru);
  return {
    slug: str(body.slug) || slugify(nameRu || str(body.name_en)),
    name_ru: nameRu,
    name_uk: str(body.name_uk),
    name_en: str(body.name_en),
    icon: str(body.icon),
    keywords: str(body.keywords),
    order_position: num(body.order_position, 99),
    active: YES_NO(body.active, "yes"),
  };
}

export function buildArticlePayload(body: any) {
  const title = str(body.title);
  const payload: Record<string, any> = {
    title,
    slug: str(body.slug) || slugify(title),
    description: str(body.description),
    content: str(body.content),
    image_url: str(body.image_url),
    category: str(body.category) || undefined,
    language: ["ru", "uk", "en"].includes(body.language) ? body.language : "ru",
    published: YES_NO(body.published, "no"),
  };

  // `cover` is only touched when the client explicitly sends it.
  const cover = firstFileName(body.cover);
  if (body.cover === null || cover === "") payload.cover = null;
  else if (cover) payload.cover = { name: cover };

  return payload;
}

/** First file-name id of whatever the client sent for a single-file field. */
function firstFileName(value: any): string | undefined {
  if (typeof value === "undefined") return undefined;
  if (value === null) return "";
  const entry = Array.isArray(value) ? value[0] : value;
  const name = typeof entry === "string" ? entry : entry?.name;
  return typeof name === "string" ? name.trim() : "";
}

export function buildBannerPayload(body: any) {
  const payload: Record<string, any> = {
    title: str(body.title),
    banner_image: str(body.banner_image),
    banner_url: normalizeUrl(body.banner_url),
    position: ["home_top", "home_bottom", "catalog", "service_page"].includes(body.position)
      ? body.position
      : "home_top",
    order_position: num(body.order_position, 0),
    active: YES_NO(body.active, "no"),
  };

  const file = firstFileName(body.banner_file);
  if (body.banner_file === null || file === "") payload.banner_file = null;
  else if (file) payload.banner_file = { name: file };

  return payload;
}

/** Whitelist for one AI Radar entry — every field is managed from the admin panel. */
export function buildRadarPayload(body: any) {
  const source = body || {};
  const payload: Record<string, any> = {
    title_ru: str(source.title_ru),
    title_uk: str(source.title_uk),
    title_en: str(source.title_en),
    summary_ru: str(source.summary_ru),
    summary_uk: str(source.summary_uk),
    summary_en: str(source.summary_en),
    radar_type: RADAR_TYPES.includes(source.radar_type) ? source.radar_type : "update",
    importance: RADAR_IMPORTANCES.includes(source.importance) ? source.importance : "normal",
    source_name: str(source.source_name),
    source_url: normalizeUrl(source.source_url),
    image_url: str(source.image_url),
    published_at: str(source.published_at) || new Date().toISOString(),
    pinned: YES_NO(source.pinned, "no"),
    active: YES_NO(source.active, "yes"),
    order_position: num(source.order_position, 0),
  };

  if (typeof source.service !== "undefined") payload.service = str(source.service) || null;
  if (typeof source.category !== "undefined") payload.category = str(source.category) || null;

  const cover = firstFileName(source.cover);
  if (source.cover === null || cover === "") payload.cover = null;
  else if (cover) payload.cover = { name: cover };

  return payload;
}

/**
 * Whitelist for the public profile a user edits about themselves.
 * Partial by design: only the submitted keys are written.
 */
export function buildProfilePayload(body: any) {
  const source = body || {};
  const has = (key: string) => Object.prototype.hasOwnProperty.call(source, key);
  const payload: Record<string, any> = {};

  if (has("name")) payload.name = str(source.name);
  for (const key of PROFILE_TEXT_FIELDS) if (has(key)) payload[key] = str(source[key]);
  for (const key of PROFILE_LINK_FIELDS) if (has(key)) payload[key] = normalizeUrl(source[key]);
  if (has("show_contacts")) payload.show_contacts = YES_NO(source.show_contacts, "no");
  if (has("photos")) payload.photos = toFileLinks(source.photos, MAX_PROFILE_PHOTOS);
  if (has("language") && ["ru", "uk", "en"].includes(source.language)) payload.language = source.language;

  return payload;
}

/**
 * Affiliate-only whitelist used by the Affiliate Manager. It never touches the
 * catalog content of a service — only the monetisation fields.
 */
export function buildAffiliatePayload(body: any) {
  const affiliateUrl = str(body.affiliate_url);
  const requestedStatus = AFFILIATE_STATUSES.includes(body.affiliate_status)
    ? body.affiliate_status
    : undefined;

  // Pasting a link is enough: the service is marked connected and enabled
  // automatically, so the "Try it" button starts using it immediately.
  const status = requestedStatus || (affiliateUrl ? "connected" : "not_connected");

  const payload: Record<string, any> = {
    affiliate_url: affiliateUrl,
    affiliate_status: status,
    is_affiliate: affiliateUrl && body.is_affiliate !== "no" && body.is_affiliate !== false ? "yes" : "no",
  };

  if (typeof body.affiliate_program_url === "string") payload.affiliate_program_url = str(body.affiliate_program_url);
  if (typeof body.affiliate_network === "string") payload.affiliate_network = str(body.affiliate_network);
  if (typeof body.commission === "string") payload.commission = str(body.commission);
  if (typeof body.affiliate_notes === "string") payload.affiliate_notes = str(body.affiliate_notes);

  return payload;
}

/**
 * Whitelist for an affiliate offer. The affiliate URL is the only field that
 * really matters for monetisation, so it is always normalised (trimmed, and a
 * bare domain gets the https:// scheme it needs to be a valid redirect target).
 */
export function buildOfferPayload(body: any) {
  const payload: Record<string, any> = {};

  if (typeof body.offer_name === "string") payload.offer_name = str(body.offer_name);
  if (typeof body.external_id === "string") payload.external_id = str(body.external_id);
  if (typeof body.notes === "string") payload.notes = str(body.notes);
  if (typeof body.affiliate_url === "string") payload.affiliate_url = normalizeUrl(body.affiliate_url);
  if (PAYOUT_MODELS.includes(body.payout_model)) payload.payout_model = body.payout_model;
  if (body.active === "yes" || body.active === "no") payload.active = body.active;
  if (typeof body.order_position !== "undefined") payload.order_position = num(body.order_position, 0);

  // `null` explicitly unbinds a relation, `undefined` leaves it untouched.
  if (typeof body.network !== "undefined") payload.network = str(body.network) || null;
  if (typeof body.service !== "undefined") payload.service = str(body.service) || null;

  return payload;
}

/** Adds the scheme a redirect needs; leaves an empty value empty. */
export function normalizeUrl(value: any): string {
  const url = str(value);
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url.replace(/^\/+/, "")}`;
}

/** Whitelist for a prompt folder / guide managed from the Telegram admin tab. */
export function buildFolderPayload(body: any) {
  const title = str(body.title);
  const accessType = body.access_type === "referral" ? "referral" : "free";
  const required = Math.max(Math.round(num(body.required_referrals, 0)), 0);

  const payload: Record<string, any> = {
    title,
    slug: str(body.slug) || slugify(title),
    description: str(body.description),
    icon: str(body.icon) || "📁",
    content: str(body.content),
    external_url: normalizeUrl(body.external_url),
    content_type: ["prompts", "guide", "instruction"].includes(body.content_type)
      ? body.content_type
      : "prompts",
    access_type: accessType,
    // A referral material always needs at least one invite, a free one needs none.
    required_referrals: accessType === "referral" ? Math.max(required, 1) : 0,
    order_position: num(body.order_position, 99),
    active: YES_NO(body.active, "yes"),
  };

  // `file` is only touched when the client explicitly sends it: `null` clears
  // the upload, a file-name id links a freshly uploaded document.
  if (body.file === null) payload.file = null;
  else if (typeof body.file === "string" && body.file.trim()) payload.file = { name: body.file.trim() };

  return payload;
}
