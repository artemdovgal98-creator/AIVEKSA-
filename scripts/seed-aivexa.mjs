/**
 * AIVEXA initial catalog seeder.
 *
 * - Creates the 12 categories and 41 real AI services.
 * - Ukrainian copy is produced by the AI model built into the Totalum SDK
 *   (translated from the hand written Russian copy) — no external API key needed.
 * - Affiliate links are NEVER invented: every service is seeded with
 *   is_affiliate = "no" and only the official URL.
 *
 * Run: node scripts/seed-aivexa.mjs
 */
import { createRequire } from "module";
import fs from "fs";
import path from "path";
import { CATEGORIES, SERVICES } from "./seed-data.mjs";
import { ARTICLES } from "./seed-articles.mjs";

const require = createRequire(import.meta.url);
const { TotalumApiSdk } = require("totalum-api-sdk");

// --- env ---------------------------------------------------------------
const envPath = path.resolve(process.cwd(), ".env");
for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
  const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (match) process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
}

const sdk = new TotalumApiSdk({ apiKey: { "api-key": process.env.TOTALUM_API_KEY } });
sdk.changeBaseUrl(process.env.TOTALUM_API_URL || "https://api.totalum.app/");

const logoUrl = (domain) => `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
const list = (arr) => (arr || []).join("\n");

// --- Ukrainian copy via the built-in AI --------------------------------
async function translateBatchToUk(batch) {
  const payload = batch.map((service) => ({
    slug: service.slug,
    d: service.ru.d,
    f: service.ru.f,
    p: service.ru.p,
    c: service.ru.c,
  }));

  const result = await sdk.openai.createChatCompletion({
    messages: [
      {
        role: "system",
        content:
          "You are a professional Russian to Ukrainian translator. Translate every string value into natural, fluent Ukrainian. Keep brand names, product names and technical terms untouched. Return ONLY a valid JSON array with exactly the same structure and keys, no markdown fences, no commentary.",
      },
      { role: "user", content: JSON.stringify(payload) },
    ],
    model: "gpt-4.1-mini",
    max_tokens: 3000,
    temperature: 0.2,
  });

  const raw = result?.data?.choices?.[0]?.message?.content || "";
  const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const parsed = JSON.parse(cleaned);
  if (!Array.isArray(parsed)) throw new Error("translation is not an array");
  return parsed;
}

async function buildUkTranslations(services) {
  const map = new Map();
  const chunkSize = 5;
  for (let i = 0; i < services.length; i += chunkSize) {
    const chunk = services.slice(i, i + chunkSize);
    try {
      const translated = await translateBatchToUk(chunk);
      for (const entry of translated) {
        if (entry?.slug) map.set(entry.slug, entry);
      }
      console.log(`  [uk] translated ${Math.min(i + chunkSize, services.length)}/${services.length}`);
    } catch (err) {
      console.error(`  [uk] batch starting at ${i} failed, falling back to RU copy:`, err.message);
    }
  }
  return map;
}

// --- seeding -----------------------------------------------------------
async function seedCategories() {
  const existing = await sdk.crud.query("categories", { _limit: 200 });
  const bySlug = new Map((existing.data || []).map((category) => [category.slug, category]));
  const ids = new Map();

  for (const category of CATEGORIES) {
    if (bySlug.has(category.slug)) {
      ids.set(category.slug, bySlug.get(category.slug)._id);
      console.log(`  = category ${category.slug} already exists`);
      continue;
    }
    const created = await sdk.crud.createRecord("categories", { ...category, active: "yes" });
    if (created.errors) console.error("  ! category errors:", created.errors);
    ids.set(category.slug, created.data._id);
    console.log(`  + category ${category.slug}`);
  }
  return ids;
}

async function seedServices(categoryIds, ukMap) {
  const existing = await sdk.crud.query("services", { _limit: 1000 });
  const bySlug = new Set((existing.data || []).map((service) => service.slug));

  for (const service of SERVICES) {
    if (bySlug.has(service.slug)) {
      console.log(`  = service ${service.slug} already exists`);
      continue;
    }
    const uk = ukMap.get(service.slug);
    const record = {
      name: service.name,
      slug: service.slug,
      category: categoryIds.get(service.cat),
      logo_url: logoUrl(service.domain),
      official_url: service.url,
      // Affiliate links are added by the owner in the admin panel — never invented here.
      affiliate_url: "",
      is_affiliate: "no",
      free_plan: service.free,
      pricing_type: service.price_type,
      pricing: service.price,
      rating: service.rating,
      popularity: service.popularity,
      views: 0,
      tags: service.tags,
      keywords: service.keywords,
      description_ru: service.ru.d,
      description_uk: uk?.d || service.ru.d,
      description_en: service.en.d,
      features_ru: list(service.ru.f),
      features_uk: list(uk?.f || service.ru.f),
      features_en: list(service.en.f),
      pros_ru: list(service.ru.p),
      pros_uk: list(uk?.p || service.ru.p),
      pros_en: list(service.en.p),
      cons_ru: list(service.ru.c),
      cons_uk: list(uk?.c || service.ru.c),
      cons_en: list(service.en.c),
      featured: service.featured,
      popular: service.popular,
      active: "yes",
    };
    const created = await sdk.crud.createRecord("services", record);
    if (created.errors) console.error(`  ! service ${service.slug} errors:`, created.errors);
    console.log(`  + service ${service.slug}`);
  }
}

async function seedArticles(categoryIds) {
  const existing = await sdk.crud.query("articles", { _limit: 200 });
  const bySlug = new Set((existing.data || []).map((article) => article.slug));

  for (const article of ARTICLES) {
    if (bySlug.has(article.slug)) {
      console.log(`  = article ${article.slug} already exists`);
      continue;
    }
    const created = await sdk.crud.createRecord("articles", {
      title: article.title,
      slug: article.slug,
      description: article.description,
      content: article.content,
      image_url: article.image_url,
      category: article.cat ? categoryIds.get(article.cat) : undefined,
      language: article.language,
      published: "yes",
    });
    if (created.errors) console.error(`  ! article ${article.slug} errors:`, created.errors);
    console.log(`  + article ${article.slug}`);
  }
}

async function seedSettings() {
  const existing = await sdk.crud.query("admin_settings", { _limit: 100 });
  const keys = new Set((existing.data || []).map((setting) => setting.setting_key));
  const defaults = [
    { setting_key: "site_name", setting_value: "AIVEXA", description: "Название сайта" },
    { setting_key: "ads_enabled", setting_value: "no", description: "Показывать рекламные баннеры (yes/no)" },
    { setting_key: "default_language", setting_value: "ru", description: "Язык по умолчанию" },
  ];
  for (const setting of defaults) {
    if (keys.has(setting.setting_key)) continue;
    await sdk.crud.createRecord("admin_settings", setting);
    console.log(`  + setting ${setting.setting_key}`);
  }
}

async function main() {
  console.log("AIVEXA seed — categories");
  const categoryIds = await seedCategories();

  console.log("AIVEXA seed — Ukrainian translations (built-in AI)");
  const ukMap = await buildUkTranslations(SERVICES);

  console.log("AIVEXA seed — services");
  await seedServices(categoryIds, ukMap);

  console.log("AIVEXA seed — articles");
  await seedArticles(categoryIds);

  console.log("AIVEXA seed — settings");
  await seedSettings();

  console.log("AIVEXA seed — done");
}

main().catch((err) => {
  console.error("SEED FAILED:", err);
  process.exit(1);
});
