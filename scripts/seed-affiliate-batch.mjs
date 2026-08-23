/**
 * AIVEXA — affiliate expansion seeder.
 *
 * 1. Creates the 12 AI services that were missing from the catalog.
 * 2. Writes the verified affiliate metadata onto all 20 target services.
 * 3. Moves Descript → Video and Gamma → Presentations.
 *
 * Nothing here invents an affiliate link: `affiliate_url` stays empty and is
 * filled by the owner in Admin → Affiliate Manager.
 *
 * Run: node scripts/seed-affiliate-batch.mjs
 */
import { createRequire } from "module";
import fs from "fs";
import path from "path";
import { AFFILIATE, EXISTING_UPDATES, NEW_SERVICES } from "./affiliate-data.mjs";

const require = createRequire(import.meta.url);
const { TotalumApiSdk } = require("totalum-api-sdk");

const envPath = path.resolve(process.cwd(), ".env");
for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
  const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (match) process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
}

const sdk = new TotalumApiSdk({ apiKey: { "api-key": process.env.TOTALUM_API_KEY } });
sdk.changeBaseUrl(process.env.TOTALUM_API_URL || "https://api.totalum.app/");

const logoUrl = (domain) => `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
const list = (arr) => (arr || []).join("\n");

// --- Ukrainian copy through the built-in Totalum AI ---------------------
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
  const chunkSize = 4;
  for (let i = 0; i < services.length; i += chunkSize) {
    const chunk = services.slice(i, i + chunkSize);
    try {
      const translated = await translateBatchToUk(chunk);
      for (const entry of translated) if (entry?.slug) map.set(entry.slug, entry);
      console.log(`  [uk] translated ${Math.min(i + chunkSize, services.length)}/${services.length}`);
    } catch (err) {
      console.error(`  [uk] batch at ${i} failed, falling back to RU copy:`, err.message);
    }
  }
  return map;
}

function affiliatePayload(slug) {
  const data = AFFILIATE[slug];
  if (!data) return {};
  return {
    affiliate_program_url: data.program,
    affiliate_network: data.network,
    commission: data.commission,
    affiliate_status: data.status,
    affiliate_notes: data.notes,
  };
}

async function main() {
  console.log("→ loading categories…");
  const categoriesResult = await sdk.crud.query("categories", { _limit: 200 });
  const categoryIds = new Map((categoriesResult.data || []).map((c) => [c.slug, c._id]));
  for (const slug of ["video", "voice", "writing", "seo", "meetings", "presentations"]) {
    if (!categoryIds.has(slug)) throw new Error(`missing category: ${slug}`);
  }

  console.log("→ translating new services to Ukrainian…");
  const ukMap = await buildUkTranslations(NEW_SERVICES);

  console.log("→ creating new services…");
  const existingResult = await sdk.crud.query("services", { _limit: 1000 });
  const existing = new Map((existingResult.data || []).map((s) => [s.slug, s]));

  let created = 0;
  for (const service of NEW_SERVICES) {
    if (existing.has(service.slug)) {
      console.log(`  = ${service.slug} already exists, updating affiliate data only`);
      const updated = await sdk.crud.editRecordById("services", existing.get(service.slug)._id, {
        ...affiliatePayload(service.slug),
        category: categoryIds.get(service.cat),
      });
      if (updated.errors) console.error(`  ! ${service.slug}:`, updated.errors);
      continue;
    }

    const uk = ukMap.get(service.slug);
    const record = {
      name: service.name,
      slug: service.slug,
      category: categoryIds.get(service.cat),
      logo_url: logoUrl(service.domain),
      official_url: service.url,
      // Never invented — the owner pastes their own link in the admin panel.
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
      ...affiliatePayload(service.slug),
    };

    const result = await sdk.crud.createRecord("services", record);
    if (result.errors) {
      console.error(`  ! ${service.slug} errors:`, result.errors);
      throw new Error(`failed to create ${service.slug}`);
    }
    created += 1;
    console.log(`  + ${service.slug}`);
  }

  console.log("→ updating existing services with affiliate data…");
  for (const update of EXISTING_UPDATES) {
    const record = existing.get(update.slug);
    if (!record) {
      console.error(`  ! ${update.slug} not found in the catalog`);
      continue;
    }
    const payload = affiliatePayload(update.slug);
    if (update.cat) payload.category = categoryIds.get(update.cat);
    const result = await sdk.crud.editRecordById("services", record._id, payload);
    if (result.errors) console.error(`  ! ${update.slug} errors:`, result.errors);
    else console.log(`  ~ ${update.slug} updated`);
  }

  console.log("→ defaulting affiliate_status for every other service…");
  let defaulted = 0;
  for (const [slug, record] of existing) {
    if (AFFILIATE[slug] || NEW_SERVICES.some((s) => s.slug === slug)) continue;
    if (record.affiliate_status) continue;
    const result = await sdk.crud.editRecordById("services", record._id, {
      affiliate_status: "not_connected",
    });
    if (result.errors) console.error(`  ! ${slug} errors:`, result.errors);
    else defaulted += 1;
  }
  console.log(`  ~ ${defaulted} services set to "not_connected"`);

  const total = await sdk.crud.query("services", { _aggregate: { _count: true } });
  const count = Array.isArray(total.data) ? total.data[0]?._aggregate?._count : total.data?._aggregate?._count;
  console.log(`\n✓ done — created ${created} new services, catalog now has ${count} services.`);
}

main().catch((err) => {
  console.error("SEED FAILED:", err);
  process.exit(1);
});
