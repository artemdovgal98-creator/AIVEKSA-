import { slugify } from "@/lib/localize";

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
