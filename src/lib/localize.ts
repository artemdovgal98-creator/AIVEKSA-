import { fileUrl, type ArticleRecord, type BannerRecord, type CategoryRecord, type Lang, type RadarRecord, type ServiceRecord } from "@/lib/types";

const FALLBACK_ORDER: Lang[] = ["ru", "en", "uk"];

/** Picks `${base}_${lang}` with graceful fallback to the other languages. */
export function pickLocalized(
  record: Record<string, any> | null | undefined,
  base: string,
  lang: Lang
): string {
  if (!record) return "";
  const direct = record[`${base}_${lang}`];
  if (typeof direct === "string" && direct.trim()) return direct;
  for (const fallback of FALLBACK_ORDER) {
    const value = record[`${base}_${fallback}`];
    if (typeof value === "string" && value.trim()) return value;
  }
  return "";
}

export function categoryName(category: CategoryRecord | null | undefined, lang: Lang): string {
  if (!category) return "";
  return pickLocalized(category, "name", lang) || category.slug || "";
}

export function serviceDescription(service: ServiceRecord, lang: Lang): string {
  return pickLocalized(service, "description", lang);
}

/**
 * Heading of a catalog card: the localized title when the owner filled one,
 * otherwise the company name.
 */
export function serviceTitle(service: ServiceRecord, lang: Lang): string {
  return pickLocalized(service, "title", lang) || service.name || "";
}

/**
 * Logo shown on a card. A custom uploaded image always wins over the default
 * network/brand icon, which in turn wins over the letter fallback.
 */
export function serviceLogo(service: ServiceRecord): string {
  return fileUrl(service.logo_files) || service.logo_url || "";
}

/** Article cover: the uploaded file wins over an external URL. */
export function articleCover(article: ArticleRecord): string {
  return fileUrl(article.cover) || article.image_url || "";
}

/** Banner image: the uploaded file wins over an external URL. */
export function bannerImage(banner: BannerRecord): string {
  return fileUrl(banner.banner_file) || banner.banner_image || "";
}

export function radarTitle(item: RadarRecord, lang: Lang): string {
  return pickLocalized(item, "title", lang);
}

export function radarSummary(item: RadarRecord, lang: Lang): string {
  return pickLocalized(item, "summary", lang);
}

export function radarImage(item: RadarRecord): string {
  return fileUrl(item.cover) || item.image_url || "";
}

/** Splits a newline separated long-string field into a clean list. */
export function toList(value: string | undefined | null): string[] {
  if (!value) return [];
  return value
    .split("\n")
    .map((line) => line.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean);
}

export function toTags(value: string | undefined | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

/** Category object when the relation was expanded, otherwise null. */
export function expandedCategory(service: ServiceRecord): CategoryRecord | null {
  const category = service.category;
  if (category && typeof category === "object") return category as CategoryRecord;
  return null;
}

/**
 * The URL the "Try it" button ultimately opens.
 *
 * Rule: if an affiliate link exists (and was not explicitly disabled by the
 * admin) it wins, otherwise the official URL is used. An empty affiliate link
 * never blocks a service from being published.
 */
export function resolveTargetUrl(service: ServiceRecord): string {
  const affiliate = (service.affiliate_url || "").trim();
  if (affiliate && service.is_affiliate !== "no") return affiliate;
  return service.official_url || "";
}

/** True when the visitor-facing "Affiliate Partner" mark should be shown. */
export function isAffiliatePartner(service: ServiceRecord): boolean {
  return service.affiliate_status === "connected" && Boolean((service.affiliate_url || "").trim());
}

export function slugify(input: string): string {
  const map: Record<string, string> = {
    а: "a", б: "b", в: "v", г: "g", ґ: "g", д: "d", е: "e", є: "ie", ё: "e", ж: "zh",
    з: "z", и: "i", і: "i", ї: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o",
    п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh",
    щ: "shch", ъ: "", ы: "y", ь: "", э: "e", ю: "iu", я: "ia",
  };
  return input
    .toLowerCase()
    .split("")
    .map((char) => (char in map ? map[char] : char))
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
