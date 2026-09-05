import { slugify } from "@/lib/localize";
import { AFFILIATE_STATUSES, PAYOUT_MODELS } from "@/lib/types";

const YES_NO = (value: any, fallback: "yes" | "no" = "no"): "yes" | "no" =>
  value === "yes" || value === true ? "yes" : value === "no" || value === false ? "no" : fallback;

const str = (value: any): string => (typeof value === "string" ? value.trim() : "");

const num = (value: any, fallback = 0): number => {
  const parsed = typeof value === "number" ? value : parseFloat(String(value ?? ""));
  return Number.isFinite(parsed) ? parsed : fallback;
};

/** Whitelists the fields an admin may write to a service — no mass assignment. */
export function buildServicePayload(body: any) {
  const name = str(body.name);
  return {
    name,
    slug: str(body.slug) || slugify(name),
    category: str(body.category) || undefined,
    logo_url: str(body.logo_url),
    official_url: str(body.official_url),
    affiliate_url: str(body.affiliate_url),
    is_affiliate: YES_NO(body.is_affiliate),
    affiliate_program_url: str(body.affiliate_program_url),
    affiliate_network: str(body.affiliate_network),
    commission: str(body.commission),
    affiliate_notes: str(body.affiliate_notes),
    free_plan: YES_NO(body.free_plan),
    pricing_type: ["free", "freemium", "paid"].includes(body.pricing_type) ? body.pricing_type : "freemium",
    pricing: str(body.pricing),
    rating: Math.min(Math.max(num(body.rating, 0), 0), 5),
    popularity: Math.max(num(body.popularity, 0), 0),
    tags: str(body.tags),
    keywords: str(body.keywords),
    description_ru: str(body.description_ru),
    description_uk: str(body.description_uk),
    description_en: str(body.description_en),
    features_ru: str(body.features_ru),
    features_uk: str(body.features_uk),
    features_en: str(body.features_en),
    pros_ru: str(body.pros_ru),
    pros_uk: str(body.pros_uk),
    pros_en: str(body.pros_en),
    cons_ru: str(body.cons_ru),
    cons_uk: str(body.cons_uk),
    cons_en: str(body.cons_en),
    featured: YES_NO(body.featured),
    popular: YES_NO(body.popular),
    active: YES_NO(body.active, "yes"),
    // Only overwrite the affiliate status when a valid one was submitted —
    // an ordinary service edit must not silently reset it.
    ...(AFFILIATE_STATUSES.includes(body.affiliate_status)
      ? { affiliate_status: body.affiliate_status }
      : {}),
  };
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
  return {
    title,
    slug: str(body.slug) || slugify(title),
    description: str(body.description),
    content: str(body.content),
    image_url: str(body.image_url),
    category: str(body.category) || undefined,
    language: ["ru", "uk", "en"].includes(body.language) ? body.language : "ru",
    published: YES_NO(body.published, "no"),
  };
}

export function buildBannerPayload(body: any) {
  return {
    title: str(body.title),
    banner_image: str(body.banner_image),
    banner_url: str(body.banner_url),
    position: ["home_top", "home_bottom", "catalog", "service_page"].includes(body.position)
      ? body.position
      : "home_top",
    active: YES_NO(body.active, "no"),
  };
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
