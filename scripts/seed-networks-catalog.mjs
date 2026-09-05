/**
 * AIVEXA — publishes the Awin and MyLead inventories as real catalog cards and
 * binds every card to its offer, so the affiliate link the owner pastes in
 * Admin → Партнёрские офферы is the one the card opens.
 *
 * Idempotent: categories and services are matched by slug, an affiliate link
 * already saved by the owner is never overwritten. Brand icons are applied at
 * the end through scripts/brand-icons.mjs, so no card stays empty.
 *
 * Run: node scripts/seed-networks-catalog.mjs
 */
import { createRequire } from "module";
import fs from "fs";
import path from "path";
import { ARCHETYPES, NETWORK_CATALOGS } from "./networks-catalog-data.mjs";
import { applyBrandIcons } from "./brand-icons.mjs";

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

async function upsertCategory(category) {
  const found = await sdk.crud.query("categories", { _filter: { slug: category.slug }, _limit: 1 });
  if (found.errors) throw new Error(`category query: ${JSON.stringify(found.errors)}`);
  const existing = (found.data || [])[0];
  if (existing) {
    const edit = await sdk.crud.editRecordById("categories", existing._id, { ...category, active: "yes" });
    if (edit.errors) throw new Error(`category ${category.slug}: ${JSON.stringify(edit.errors)}`);
    console.log(`[seed-networks] category "${category.slug}" updated`);
    return existing._id;
  }
  const created = await sdk.crud.createRecord("categories", { ...category, active: "yes" });
  if (created.errors) throw new Error(`category ${category.slug}: ${JSON.stringify(created.errors)}`);
  console.log(`[seed-networks] category "${category.slug}" created`);
  return created.data.insertedId || created.data._id;
}

async function loadOffers(networkSlug) {
  const network = await sdk.crud.query("affiliate_networks", { _filter: { slug: networkSlug }, _limit: 1 });
  if (network.errors) throw new Error(`network ${networkSlug}: ${JSON.stringify(network.errors)}`);
  const found = (network.data || [])[0];
  if (!found) throw new Error(`network "${networkSlug}" missing — run node scripts/seed-offers.mjs first`);
  const offers = await sdk.crud.query("affiliate_offers", {
    _filter: { network: found._id },
    _limit: 500,
    _sort: { order_position: 1 },
  });
  if (offers.errors) throw new Error(`offers ${networkSlug}: ${JSON.stringify(offers.errors)}`);
  return new Map((offers.data || []).map((offer) => [Number(offer.order_position), offer]));
}

function buildRecord(entry, categoryId, networkName) {
  const archetype = ARCHETYPES[entry.type];
  if (!archetype) throw new Error(`unknown archetype "${entry.type}" for ${entry.slug}`);
  return {
    name: entry.name,
    slug: entry.slug,
    category: categoryId,
    logo_url: "",
    official_url: "",
    // The tracking link is unique per account — the owner pastes it in the admin panel.
    affiliate_url: "",
    is_affiliate: "no",
    affiliate_network: networkName,
    affiliate_status: "pending",
    free_plan: archetype.free,
    pricing_type: archetype.pricingType,
    pricing: archetype.price,
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
    popular: entry.popularity >= 80 ? "yes" : "no",
    active: "yes",
  };
}

async function main() {
  const existingRes = await sdk.crud.query("services", { _limit: 1000 });
  if (existingRes.errors) throw new Error(`services: ${JSON.stringify(existingRes.errors)}`);
  const bySlug = new Map((existingRes.data || []).map((service) => [service.slug, service]));

  let created = 0;
  let updated = 0;
  let bound = 0;

  for (const catalog of NETWORK_CATALOGS) {
    const categoryId = await upsertCategory(catalog.category);
    const offersByPosition = await loadOffers(catalog.networkSlug);

    for (const entry of catalog.services) {
      const record = buildRecord(entry, categoryId, catalog.networkName);
      const existing = bySlug.get(entry.slug);
      let serviceId;

      if (existing) {
        // never clobber a link the owner already saved
        const { affiliate_url, is_affiliate, affiliate_status, logo_url, ...safe } = record;
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
        console.error(`[seed-networks] no ${catalog.networkName} offer at position ${entry.offer} for "${entry.name}"`);
        continue;
      }
      const currentBinding = typeof offer.service === "object" && offer.service ? offer.service._id : offer.service;
      if (currentBinding !== serviceId) {
        const linked = await sdk.crud.editRecordById("affiliate_offers", offer._id, { service: serviceId });
        if (linked.errors) throw new Error(`bind ${entry.slug}: ${JSON.stringify(linked.errors)}`);
        bound += 1;
      }
      console.log(`[seed-networks] ${existing ? "=" : "+"} ${entry.name} → offer "${offer.offer_name}"`);
    }
  }

  console.log(`[seed-networks] cards — created ${created}, updated ${updated}, bound to offers ${bound}`);

  console.log("[seed-networks] applying brand icons…");
  await applyBrandIcons(sdk);

  const total = await sdk.crud.query("services", { _aggregate: { _count: true } });
  console.log("[seed-networks] total services:", JSON.stringify(total.data));
}

main().catch((err) => {
  console.error("[seed-networks] FATAL:", err);
  process.exit(1);
});
