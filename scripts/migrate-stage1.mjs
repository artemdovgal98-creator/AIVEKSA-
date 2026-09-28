/**
 * AIVEXA — Stage 1 migration (idempotent, NON-destructive).
 *
 * 1. Ensures the Mitgo / Admitad and Direct networks exist (config, no offers).
 * 2. Normalises every existing affiliate offer: health status, primary flag,
 *    sponsored flag and a unique /go/<offer_slug>. Nothing is overwritten once set.
 * 3. Moves every service-level affiliate URL that is not yet represented by an
 *    offer into `affiliate_offers` (the single source of truth). The original
 *    `services.affiliate_url` value is kept untouched as a legacy mirror.
 * 4. Seeds the configurable AIVEXA PRO plan ($9.99 / 30 days) if missing.
 * 5. Seeds the default affiliate ranking weights in admin_settings if missing.
 *
 * Run: node scripts/migrate-stage1.mjs
 */
import { sdk } from "./_sdk.mjs";

const clean = (value) => String(value || "").trim();

function slugify(input) {
  const map = {
    а: "a", б: "b", в: "v", г: "g", ґ: "g", д: "d", е: "e", є: "ie", ё: "e", ж: "zh",
    з: "z", и: "i", і: "i", ї: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o",
    п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh",
    щ: "shch", ъ: "", ы: "y", ь: "", э: "e", ю: "iu", я: "ia",
  };
  return String(input || "")
    .toLowerCase()
    .split("")
    .map((char) => (char in map ? map[char] : char))
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

async function all(table, extra = {}) {
  const rows = [];
  for (let offset = 0; ; offset += 500) {
    const result = await sdk.crud.query(table, { _limit: 500, _offset: offset, ...extra });
    if (result.errors) throw new Error(`${table}: ${JSON.stringify(result.errors)}`);
    const page = result.data || [];
    rows.push(...page);
    if (page.length < 500) break;
  }
  return rows;
}

const refId = (value) => (value && typeof value === "object" ? value._id : value) || "";

async function ensureNetwork(slug, data) {
  const found = await sdk.crud.query("affiliate_networks", { _filter: { slug }, _limit: 1 });
  const existing = (found.data || [])[0];
  if (existing) return existing;
  const created = await sdk.crud.createRecord("affiliate_networks", { slug, ...data });
  if (created.errors) throw new Error(JSON.stringify(created.errors));
  console.log("  + network", slug);
  return { _id: created.data.insertedId || created.data._id, slug, ...data };
}

async function main() {
  console.log("== networks");
  await ensureNetwork("admitad", {
    name: "Mitgo / Admitad",
    website: "https://www.admitad.com",
    description: "Mitgo (Admitad) — CPA network. Offers are added from the Affiliate Marketplace.",
    accent_color: "#22d3ee",
    order_position: 4,
    active: "yes",
  });
  await ensureNetwork("direct", {
    name: "Direct",
    website: "",
    description: "Direct partner programs of the AI services themselves (referral / partner links).",
    accent_color: "#a3e635",
    order_position: 5,
    active: "yes",
  });
  const networks = await all("affiliate_networks");
  const bySlug = Object.fromEntries(networks.map((n) => [n.slug, n]));

  console.log("== offers normalisation");
  const services = await all("services");
  let offers = await all("affiliate_offers");
  const usedSlugs = new Set([...services.map((s) => clean(s.slug)), ...offers.map((o) => clean(o.offer_slug))].filter(Boolean));
  const uniqueSlug = (base) => {
    let slug = base || "offer";
    let i = 2;
    while (usedSlugs.has(slug)) slug = `${base}-${i++}`;
    usedSlugs.add(slug);
    return slug;
  };
  const networkSlugOf = (offer) => networks.find((n) => n._id === refId(offer.network))?.slug || "offer";

  let normalised = 0;
  for (const offer of offers) {
    const patch = {};
    const hasUrl = Boolean(clean(offer.affiliate_url));
    if (!offer.status) patch.status = offer.active === "no" ? "inactive" : hasUrl ? "active" : "needs_review";
    if (!offer.is_primary) patch.is_primary = "yes"; // every service had at most one offer
    if (!offer.sponsored) patch.sponsored = "no";
    if (!clean(offer.offer_slug)) patch.offer_slug = uniqueSlug(`${networkSlugOf(offer)}-${slugify(offer.offer_name)}`);
    if (Object.keys(patch).length) {
      const r = await sdk.crud.editRecordById("affiliate_offers", offer._id, patch);
      if (r.errors) throw new Error(JSON.stringify(r.errors));
      normalised++;
    }
  }
  console.log("  normalised", normalised, "of", offers.length);

  console.log("== service affiliate URLs → affiliate_offers");
  offers = await all("affiliate_offers");
  const detectNetwork = (service) => {
    const hint = `${clean(service.affiliate_network)} ${clean(service.affiliate_url)}`.toLowerCase();
    if (/crak|vlmai/.test(hint)) return bySlug.crakrevenue;
    if (/mylead/.test(hint)) return bySlug.mylead;
    if (/awin/.test(hint)) return bySlug.awin;
    if (/admitad|mitgo/.test(hint)) return bySlug.admitad;
    return bySlug.direct;
  };

  let migrated = 0;
  for (const service of services) {
    const url = clean(service.affiliate_url);
    if (!url) continue;
    const own = offers.filter((o) => refId(o.service) === service._id);
    if (own.some((o) => clean(o.affiliate_url) === url)) continue;

    const network = detectNetwork(service);
    const name = clean(service.name) || clean(service.title_ru) || clean(service.title_en) || service.slug;
    const created = await sdk.crud.createRecord("affiliate_offers", {
      offer_name: name.split(" — ")[0].slice(0, 120),
      external_id: "",
      affiliate_url: url,
      payout_model: "other",
      notes: "Migrated from services.affiliate_url (Stage 1, 2026-09-28).",
      order_position: 1000 + migrated,
      active: service.is_affiliate === "no" ? "no" : "yes",
      status: service.is_affiliate === "no" ? "inactive" : "active",
      // The service-level link used to win in /go, so it stays the primary one.
      is_primary: "yes",
      sponsored: "no",
      offer_slug: uniqueSlug(`${network?.slug || "direct"}-${slugify(name.split(" — ")[0])}`),
      network: network?._id || null,
      service: service._id,
    });
    if (created.errors) throw new Error(JSON.stringify(created.errors));
    for (const other of own) {
      if (other.is_primary !== "no") await sdk.crud.editRecordById("affiliate_offers", other._id, { is_primary: "no" });
    }
    migrated++;
  }
  console.log("  migrated", migrated, "service links");

  console.log("== plans");
  const pro = await sdk.crud.query("plans", { _filter: { slug: "pro" }, _limit: 1 });
  if (!(pro.data || []).length) {
    const created = await sdk.crud.createRecord("plans", {
      name: "AIVEXA PRO",
      slug: "pro",
      price: 9.99,
      currency: "usd",
      duration_days: 30,
      description: "Advanced AIVEXA tools. The main AI catalog always stays free.",
      features: [
        "Social Studio",
        "AI Content Generator",
        "Advanced AI Radar analytics",
        "No ads",
        "Priority AI Credits",
      ].join("\n"),
      access_rules: ["pro", "social_studio", "content_generator", "radar_analytics", "no_ads", "priority_credits"],
      ai_credits: 100,
      social_limit: 5,
      publishing_limit: 100,
      scheduling: "yes",
      analytics: "yes",
      order_position: 1,
      active: "yes",
    });
    if (created.errors) throw new Error(JSON.stringify(created.errors));
    console.log("  + AIVEXA PRO");
  } else console.log("  AIVEXA PRO already exists");

  console.log("== ranking weights");
  const weights = await sdk.crud.query("admin_settings", { _filter: { setting_key: "affiliate_ranking_weights" }, _limit: 1 });
  if (!(weights.data || []).length) {
    await sdk.crud.createRecord("admin_settings", {
      setting_key: "affiliate_ranking_weights",
      setting_value: JSON.stringify({ relevance: 45, performance: 20, cr: 10, epc: 10, payout: 5, popularity: 5, quality: 5 }),
      description: "Affiliate ranking weights (percent). Relevance always dominates payout.",
    });
    console.log("  + default weights");
  }

  console.log("done");
}

main().catch((err) => {
  console.error("migration failed:", err);
  process.exit(1);
});
