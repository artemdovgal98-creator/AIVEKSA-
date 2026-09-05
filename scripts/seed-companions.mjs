/**
 * AIVEXA — seeds the 50 partner catalog entries and binds each one to its
 * CrakRevenue offer, so the link the owner pastes in Admin → Партнёрские офферы
 * (or Admin → Affiliate Manager) is the one the catalog card opens.
 *
 * Idempotent: services are matched by slug, existing affiliate links are never
 * overwritten.
 *
 * Run: node scripts/seed-companions.mjs
 */
import { createRequire } from "module";
import fs from "fs";
import path from "path";
import { COMPANION_CATEGORY, ARCHETYPES, COMPANION_SERVICES } from "./companions-data.mjs";

const require = createRequire(import.meta.url);
const { TotalumApiSdk } = require("totalum-api-sdk");

const envPath = path.resolve(process.cwd(), ".env");
for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
  const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (match) process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
}

const sdk = new TotalumApiSdk({ apiKey: { "api-key": process.env.TOTALUM_API_KEY } });
sdk.changeBaseUrl(process.env.TOTALUM_API_URL || "https://api.totalum.app/");

const list = (arr) => (arr || []).join("\n");

async function upsertCategory() {
  const found = await sdk.crud.query("categories", { _filter: { slug: COMPANION_CATEGORY.slug }, _limit: 1 });
  if (found.errors) console.error("[seed-companions] category query errors:", found.errors);
  const existing = (found.data || [])[0];
  if (existing) {
    console.log(`[seed-companions] category "${COMPANION_CATEGORY.slug}" already exists`);
    return existing._id;
  }
  const created = await sdk.crud.createRecord("categories", { ...COMPANION_CATEGORY, active: "yes" });
  if (created.errors) throw new Error(`category: ${JSON.stringify(created.errors)}`);
  console.log(`[seed-companions] category "${COMPANION_CATEGORY.slug}" created`);
  return created.data.insertedId || created.data._id;
}

async function loadCrakOffers() {
  const network = await sdk.crud.query("affiliate_networks", { _filter: { slug: "crakrevenue" }, _limit: 1 });
  const found = (network.data || [])[0];
  if (!found) throw new Error("CrakRevenue network is missing — run node scripts/seed-offers.mjs first");
  const offers = await sdk.crud.query("affiliate_offers", {
    _filter: { network: found._id },
    _limit: 500,
    _sort: { order_position: 1 },
  });
  if (offers.errors) console.error("[seed-companions] offer query errors:", offers.errors);
  const byPosition = new Map();
  for (const offer of offers.data || []) byPosition.set(Number(offer.order_position), offer);
  return byPosition;
}

function buildRecord(entry, categoryId) {
  const archetype = ARCHETYPES[entry.type];
  return {
    name: entry.name,
    slug: entry.slug,
    category: categoryId,
    logo_url: "/brand/crakrevenue-whale.svg",
    official_url: "",
    // The tracking link is unique per account — the owner pastes it in the admin panel.
    affiliate_url: "",
    is_affiliate: "no",
    affiliate_network: "CrakRevenue",
    affiliate_status: "pending",
    free_plan: "yes",
    pricing_type: "freemium",
    pricing: entry.price,
    rating: entry.rating,
    popularity: entry.popularity,
    views: 0,
    tags: archetype.tags,
    keywords: `${entry.name}, ${archetype.tags}`,
    description_ru: entry.ru,
    description_uk: entry.uk,
    description_en: entry.en,
    features_ru: list(archetype.ru.f),
    features_uk: list(archetype.uk.f),
    features_en: list(archetype.en.f),
    pros_ru: list(archetype.ru.p),
    pros_uk: list(archetype.uk.p),
    pros_en: list(archetype.en.p),
    cons_ru: list(archetype.ru.c),
    cons_uk: list(archetype.uk.c),
    cons_en: list(archetype.en.c),
    featured: "no",
    popular: entry.popularity >= 85 ? "yes" : "no",
    active: "yes",
  };
}

async function main() {
  const categoryId = await upsertCategory();
  const offersByPosition = await loadCrakOffers();

  const existingRes = await sdk.crud.query("services", { _limit: 1000 });
  if (existingRes.errors) console.error("[seed-companions] services query errors:", existingRes.errors);
  const bySlug = new Map((existingRes.data || []).map((service) => [service.slug, service]));

  let created = 0;
  let updated = 0;
  let bound = 0;

  for (const entry of COMPANION_SERVICES) {
    const record = buildRecord(entry, categoryId);
    const existing = bySlug.get(entry.slug);
    let serviceId;

    if (existing) {
      // never clobber a link the owner already saved
      const { affiliate_url, is_affiliate, affiliate_status, ...safe } = record;
      const result = await sdk.crud.editRecordById("services", existing._id, safe);
      if (result.errors) throw new Error(`service ${entry.slug}: ${JSON.stringify(result.errors)}`);
      serviceId = existing._id;
      updated += 1;
    } else {
      const result = await sdk.crud.createRecord("services", record);
      if (result.errors) throw new Error(`service ${entry.slug}: ${JSON.stringify(result.errors)}`);
      serviceId = result.data.insertedId || result.data._id;
      created += 1;
    }

    const offer = offersByPosition.get(entry.offer);
    if (!offer) {
      console.error(`[seed-companions] no CrakRevenue offer at position ${entry.offer} for "${entry.name}"`);
      continue;
    }
    const currentBinding = typeof offer.service === "object" && offer.service ? offer.service._id : offer.service;
    if (currentBinding !== serviceId) {
      const linked = await sdk.crud.editRecordById("affiliate_offers", offer._id, { service: serviceId });
      if (linked.errors) throw new Error(`bind ${entry.slug}: ${JSON.stringify(linked.errors)}`);
      bound += 1;
    }
    console.log(`[seed-companions] ${existing ? "=" : "+"} ${entry.name} → offer "${offer.offer_name}"`);
  }

  const total = await sdk.crud.query("services", { _aggregate: { _count: true } });
  console.log(`[seed-companions] done — created ${created}, updated ${updated}, bound to offers ${bound}`);
  console.log("[seed-companions] total services:", JSON.stringify(total.data));
}

main().catch((err) => {
  console.error("[seed-companions] FATAL:", err);
  process.exit(1);
});
