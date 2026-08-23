import "server-only";
import { totalumSdk } from "@/lib/totalum";
import { readCount } from "@/lib/aggregate";
import type { ArticleRecord, BannerRecord, CategoryRecord, Lang, ServiceRecord } from "@/lib/types";

/**
 * Server-side catalog data access. Every read goes through totalumSdk.crud.query()
 * so filtering / sorting / relation expansion happens in the database.
 */

const STOPWORDS = new Set([
  // ru
  "мне", "нужно", "надо", "хочу", "хочется", "как", "чтобы", "для", "это", "что", "мой", "моя",
  "нужен", "нужна", "нужны", "сделать", "помоги", "помочь", "быстро", "лучший", "лучшие", "самый",
  "или", "и", "на", "в", "с", "по", "из", "от", "про", "под", "бесплатно", "бесплатный",
  // uk
  "мені", "потрібно", "треба", "хочу", "щоб", "для", "це", "що", "мій", "моя", "зробити",
  "допоможи", "швидко", "найкращий", "найкращі", "або", "та", "на", "у", "з", "від", "про",
  // en
  "i", "need", "want", "to", "the", "a", "an", "for", "my", "me", "how", "can", "please",
  "make", "create", "best", "free", "and", "or", "with", "of", "in", "on", "is", "it",
]);

export function tokenize(input: string): string[] {
  return (input || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s+#-]/gu, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !STOPWORDS.has(token))
    .slice(0, 12);
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const SEARCHABLE_FIELDS = [
  "name",
  "slug",
  "tags",
  "keywords",
  "description_ru",
  "description_uk",
  "description_en",
  "features_ru",
  "features_uk",
  "features_en",
];

export interface ServiceQueryOptions {
  q?: string;
  categorySlug?: string;
  categoryId?: string;
  filter?: "all" | "free" | "has_free" | "paid" | "popular" | "new" | "top_rated" | "featured" | "affiliate";
  sort?: "popular" | "rating" | "new" | "name";
  limit?: number;
  offset?: number;
}

export async function getCategories(onlyActive = true): Promise<CategoryRecord[]> {
  const filter: Record<string, any> = {};
  if (onlyActive) filter.active = "yes";
  const result = await totalumSdk.crud.query("categories", {
    _filter: filter,
    _sort: { order_position: "asc" },
    _limit: 100,
  });
  if (result.errors) console.error("[catalog] getCategories errors:", result.errors);
  return (result.data || []) as unknown as CategoryRecord[];
}

export async function getCategoryBySlug(slug: string): Promise<CategoryRecord | null> {
  const result = await totalumSdk.crud.query("categories", {
    _filter: { slug },
    _limit: 1,
  });
  if (result.errors) console.error("[catalog] getCategoryBySlug errors:", result.errors);
  const list = (result.data || []) as unknown as CategoryRecord[];
  return list[0] || null;
}

/** Relevance scoring used for search and for the "Which AI do I need?" matcher. */
export function scoreService(service: ServiceRecord, tokens: string[]): number {
  if (!tokens.length) return 0;
  const name = (service.name || "").toLowerCase();
  const tags = (service.tags || "").toLowerCase();
  const keywords = (service.keywords || "").toLowerCase();
  const descriptions = [service.description_ru, service.description_uk, service.description_en]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const features = [service.features_ru, service.features_uk, service.features_en]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const category = service.category && typeof service.category === "object" ? (service.category as CategoryRecord) : null;
  const categoryText = category
    ? [category.slug, category.name_ru, category.name_uk, category.name_en, category.keywords]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
    : "";

  let score = 0;
  for (const token of tokens) {
    if (name.includes(token)) score += 12;
    if (keywords.includes(token)) score += 8;
    if (tags.includes(token)) score += 6;
    if (categoryText.includes(token)) score += 5;
    if (descriptions.includes(token)) score += 3;
    if (features.includes(token)) score += 2;
  }
  // Light quality boost so equally relevant services are ordered sensibly
  score += (service.rating || 0) * 0.6;
  score += Math.min(service.popularity || 0, 100) / 50;
  return score;
}

export async function getServices(
  options: ServiceQueryOptions = {}
): Promise<{ items: ServiceRecord[]; total: number }> {
  const { q, categorySlug, filter = "all", sort = "popular", limit = 24, offset = 0 } = options;

  const dbFilter: Record<string, any> = { active: "yes" };

  let categoryId = options.categoryId;
  if (!categoryId && categorySlug) {
    const category = await getCategoryBySlug(categorySlug);
    if (!category) return { items: [], total: 0 };
    categoryId = category._id;
  }
  if (categoryId) dbFilter.category = categoryId;

  switch (filter) {
    case "free":
      dbFilter.pricing_type = "free";
      break;
    case "has_free":
      dbFilter.free_plan = "yes";
      break;
    case "paid":
      dbFilter.pricing_type = "paid";
      break;
    case "popular":
      dbFilter.popular = "yes";
      break;
    case "top_rated":
      dbFilter.rating = { gte: 4.5 };
      break;
    case "featured":
      dbFilter.featured = "yes";
      break;
    case "affiliate":
      // 💰 Affiliate Picks — only services the owner really connected.
      dbFilter.affiliate_status = "connected";
      dbFilter.is_affiliate = "yes";
      break;
    default:
      break;
  }

  const tokens = tokenize(q || "");
  if (tokens.length) {
    dbFilter._or = tokens.flatMap((token) =>
      SEARCHABLE_FIELDS.map((field) => ({ [field]: { regex: escapeRegex(token), options: "i" } }))
    );
  }

  const sortMap: Record<string, Record<string, "asc" | "desc">> = {
    popular: { popularity: "desc" },
    rating: { rating: "desc" },
    new: { createdAt: "desc" },
    name: { name: "asc" },
  };
  const effectiveSort = filter === "new" ? sortMap.new : sortMap[sort] || sortMap.popular;

  // With a text query we need relevance ordering, so pull the matching set and rank it here.
  const useRelevance = tokens.length > 0;
  const queryOptions: Record<string, any> = {
    _filter: dbFilter,
    _sort: effectiveSort,
    _limit: useRelevance ? 300 : limit,
    category: true,
  };
  if (!useRelevance) queryOptions._offset = offset;

  const result = await totalumSdk.crud.query("services", queryOptions);
  if (result.errors) console.error("[catalog] getServices errors:", result.errors);
  let items = (result.data || []) as unknown as ServiceRecord[];

  if (useRelevance) {
    const total = items.length;
    items = items
      .map((service) => ({ service, score: scoreService(service, tokens) }))
      .sort((a, b) => b.score - a.score)
      .map((entry) => entry.service)
      .slice(offset, offset + limit);
    return { items, total };
  }

  const countResult = await totalumSdk.crud.query("services", {
    _filter: dbFilter,
    _aggregate: { _count: true },
  });
  if (countResult.errors) console.error("[catalog] getServices count errors:", countResult.errors);
  const total = readCount(countResult);

  return { items, total: total || items.length };
}

export async function getServiceBySlug(slug: string): Promise<ServiceRecord | null> {
  const result = await totalumSdk.crud.query("services", {
    _filter: { slug },
    _limit: 1,
    category: true,
  });
  if (result.errors) console.error("[catalog] getServiceBySlug errors:", result.errors);
  const list = (result.data || []) as unknown as ServiceRecord[];
  return list[0] || null;
}

export async function getSimilarServices(service: ServiceRecord, limit = 4): Promise<ServiceRecord[]> {
  const categoryId =
    service.category && typeof service.category === "object"
      ? (service.category as CategoryRecord)._id
      : (service.category as string | undefined);
  if (!categoryId) return [];
  const result = await totalumSdk.crud.query("services", {
    _filter: { active: "yes", category: categoryId, _id: { ne: service._id } },
    _sort: { popularity: "desc" },
    _limit: limit,
    category: true,
  });
  if (result.errors) console.error("[catalog] getSimilarServices errors:", result.errors);
  return (result.data || []) as unknown as ServiceRecord[];
}

/**
 * Catalog-driven AI matcher.
 * Stage 1 (current): pure relevance scoring over categories, tags, keywords and descriptions.
 * Stage 2 (future): call an LLM to expand the task into keywords, then reuse the same scoring —
 * see matchServices() in src/app/api/match/route.ts for the single integration point.
 */
export async function matchServices(
  task: string,
  limit = 6
): Promise<{ service: ServiceRecord; score: number }[]> {
  const tokens = tokenize(task);
  if (!tokens.length) return [];

  const result = await totalumSdk.crud.query("services", {
    _filter: {
      active: "yes",
      _or: tokens.flatMap((token) =>
        SEARCHABLE_FIELDS.map((field) => ({ [field]: { regex: escapeRegex(token), options: "i" } }))
      ),
    },
    _limit: 300,
    category: true,
  });
  if (result.errors) console.error("[catalog] matchServices errors:", result.errors);

  const services = (result.data || []) as unknown as ServiceRecord[];
  const scored = services
    .map((service) => ({ service, score: scoreService(service, tokens) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  const best = scored[0]?.score || 1;
  return scored.map((entry) => ({
    service: entry.service,
    score: Math.max(35, Math.round((entry.score / best) * 100)),
  }));
}

export async function getArticles(lang?: Lang, limit = 30): Promise<ArticleRecord[]> {
  const filter: Record<string, any> = { published: "yes" };
  if (lang) filter.language = lang;
  const result = await totalumSdk.crud.query("articles", {
    _filter: filter,
    _sort: { createdAt: "desc" },
    _limit: limit,
    category: true,
  });
  if (result.errors) console.error("[catalog] getArticles errors:", result.errors);
  return (result.data || []) as unknown as ArticleRecord[];
}

export async function getArticleBySlug(slug: string): Promise<ArticleRecord | null> {
  const result = await totalumSdk.crud.query("articles", {
    _filter: { slug },
    _limit: 1,
    category: true,
  });
  if (result.errors) console.error("[catalog] getArticleBySlug errors:", result.errors);
  const list = (result.data || []) as unknown as ArticleRecord[];
  return list[0] || null;
}

export async function getBanners(position?: BannerRecord["position"]): Promise<BannerRecord[]> {
  const filter: Record<string, any> = { active: "yes" };
  if (position) filter.position = position;
  const result = await totalumSdk.crud.query("banners", {
    _filter: filter,
    _limit: 10,
  });
  if (result.errors) console.error("[catalog] getBanners errors:", result.errors);
  return (result.data || []) as unknown as BannerRecord[];
}

/** Real page-view counter for a service detail page. Non critical: logged, never thrown. */
export async function incrementServiceViews(serviceId: string, current: number | undefined) {
  try {
    await totalumSdk.crud.editRecordById("services", serviceId, { views: (current || 0) + 1 });
  } catch (err) {
    console.error("[catalog] failed to increment views for", serviceId, err);
  }
}
