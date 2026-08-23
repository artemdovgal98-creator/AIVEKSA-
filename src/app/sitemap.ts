import type { MetadataRoute } from "next";
import { getArticles, getCategories, getServices } from "@/lib/catalog";

export const dynamic = "force-dynamic";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`, changeFrequency: "daily", priority: 1 },
    { url: `${BASE_URL}/catalog`, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/match`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/tools`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/guide`, changeFrequency: "weekly", priority: 0.7 },
  ];

  try {
    const [categories, services, articles] = await Promise.all([
      getCategories(),
      getServices({ limit: 1000, sort: "name" }),
      getArticles(undefined, 200),
    ]);

    return [
      ...staticPages,
      ...categories.map((category) => ({
        url: `${BASE_URL}/category/${category.slug}`,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
      ...services.items.map((service) => ({
        url: `${BASE_URL}/ai/${service.slug}`,
        lastModified: service.updatedAt ? new Date(service.updatedAt) : undefined,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })),
      ...articles.map((article) => ({
        url: `${BASE_URL}/guide/${article.slug}`,
        lastModified: article.updatedAt ? new Date(article.updatedAt) : undefined,
        changeFrequency: "monthly" as const,
        priority: 0.6,
      })),
    ];
  } catch (err) {
    console.error("[sitemap] failed to build dynamic entries:", err);
    return staticPages;
  }
}
