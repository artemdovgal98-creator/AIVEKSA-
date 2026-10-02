import "server-only";
import { totalumSdk } from "@/lib/totalum";
import { slugify } from "@/lib/localize";
import { safeHttpUrl } from "@/lib/url-safety";
import { MAX_SERVICE_LOGOS, type Lang, type ServiceRecord } from "@/lib/types";

/**
 * Admin → AI Catalog form: EXACTLY six fields.
 *   1 title · 2 description · 3 official_url · 4 partner_url · 5 partner_enabled · 6 image
 * Everything technical (network, offer id, tracking, metrics…) is managed in the
 * Affiliate Marketplace, never here.
 */
export interface ServiceFormInput {
  title?: string;
  description?: string;
  official_url?: string;
  partner_url?: string;
  partner_enabled?: boolean;
  /** Totalum file-name id of an image uploaded through /api/admin/upload, or null to remove it. */
  image?: string | null;
}

export class FormError extends Error {
  constructor(public field: string, message: string) {
    super(message);
  }
}

const FILE_ID_RE = /^[\w.\-]{4,200}$/;

export function parseServiceForm(body: any, mode: "create" | "update"): ServiceFormInput {
  const source = body || {};
  const has = (key: string) => Object.prototype.hasOwnProperty.call(source, key);
  const out: ServiceFormInput = {};

  if (has("title") || mode === "create") {
    const title = typeof source.title === "string" ? source.title.trim() : "";
    if (title.length < 2 || title.length > 140) throw new FormError("title", "Title must be 2–140 characters");
    out.title = title;
  }
  if (has("description")) {
    const description = typeof source.description === "string" ? source.description.trim() : "";
    if (description.length > 3000) throw new FormError("description", "Description is too long (max 3000)");
    out.description = description;
  }
  if (has("official_url") || mode === "create") {
    const url = safeHttpUrl(source.official_url);
    if (!url) throw new FormError("official_url", "Enter a valid website URL (https://…)");
    out.official_url = url;
  }
  if (has("partner_url")) {
    const raw = typeof source.partner_url === "string" ? source.partner_url.trim() : "";
    if (raw) {
      const url = safeHttpUrl(raw);
      if (!url) throw new FormError("partner_url", "Enter a valid partner URL (https://…)");
      out.partner_url = url;
    } else out.partner_url = "";
  }
  if (has("partner_enabled")) out.partner_enabled = source.partner_enabled === true || source.partner_enabled === "yes";
  if (out.partner_enabled && has("partner_url") && !out.partner_url) {
    throw new FormError("partner_url", "Partner link is ON — add the partner URL or switch it off");
  }
  if (has("image")) {
    if (source.image === null || source.image === "") out.image = null;
    else if (typeof source.image === "string" && FILE_ID_RE.test(source.image)) out.image = source.image;
    else throw new FormError("image", "Invalid image");
  }
  return out;
}

async function uniqueServiceSlug(base: string): Promise<string> {
  const root = slugify(base) || "ai";
  for (let attempt = 0; attempt < 50; attempt++) {
    const candidate = attempt === 0 ? root : `${root}-${attempt + 1}`;
    const [service, offer] = await Promise.all([
      totalumSdk.crud.query("services", { _filter: { slug: candidate }, _limit: 1 }),
      totalumSdk.crud.query("affiliate_offers", { _filter: { offer_slug: candidate }, _limit: 1 }),
    ]);
    if (!(service.data || []).length && !(offer.data || []).length) return candidate;
  }
  return `${root}-${Date.now().toString(36)}`;
}

/** Service record patch for the form values (affiliate URL handled by the offers module). */
export async function servicePatchFromForm(
  input: ServiceFormInput,
  lang: Lang,
  existing: ServiceRecord | null
): Promise<Record<string, any>> {
  const patch: Record<string, any> = {};
  if (typeof input.title === "string") {
    // The card heading is localized; keep the other languages untouched.
    patch[`title_${lang}`] = input.title;
    if (!existing || !String(existing.name || "").trim()) patch.name = input.title.split(" — ")[0].slice(0, 120);
  }
  if (typeof input.description === "string") patch[`description_${lang}`] = input.description;
  if (typeof input.official_url === "string") patch.official_url = input.official_url;
  if (typeof input.partner_enabled === "boolean") patch.is_affiliate = input.partner_enabled ? "yes" : "no";
  // Legacy mirror only — the authoritative URL lives on the primary affiliate offer.
  if (typeof input.partner_url === "string") patch.affiliate_url = input.partner_url;

  if (typeof input.image !== "undefined") {
    const others = (existing?.logo_files || []).map((file) => ({ name: file.name })).slice(1);
    patch.logo_files = input.image ? [{ name: input.image }, ...others].slice(0, MAX_SERVICE_LOGOS) : others;
  }

  if (!existing) {
    patch.slug = await uniqueServiceSlug(input.title || "ai");
    patch.active = "yes";
    patch.featured = "no";
    patch.popular = "no";
    patch.free_plan = "no";
    patch.pricing_type = "freemium";
    if (!("is_affiliate" in patch)) patch.is_affiliate = "no";
  }
  return patch;
}
