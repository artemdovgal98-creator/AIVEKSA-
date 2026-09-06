/**
 * AIVEXA — keeps the offer names in the database in sync with the inventory
 * declared in `scripts/offers-data.mjs` (the single source of truth).
 *
 * No name is hardcoded here: rows are matched against the database by
 * `order_position` inside each network, missing positions are created and
 * names that already match are skipped. The owner's `affiliate_url` is never
 * touched.
 *
 * Run: node scripts/sync-offer-names.mjs
 */
import { createRequire } from "module";
import fs from "fs";
import path from "path";
import { NETWORKS, OFFERS } from "./offers-data.mjs";

const require = createRequire(import.meta.url);
const { TotalumApiSdk } = require("totalum-api-sdk");

const envPath = path.resolve(process.cwd(), ".env");
for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
  const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (match) process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
}

const sdk = new TotalumApiSdk({ apiKey: { "api-key": process.env.TOTALUM_API_KEY } });
sdk.changeBaseUrl(process.env.TOTALUM_API_URL || "https://api.totalum.app/");

async function syncNetwork(networkSlug) {
  const networkRes = await sdk.crud.query("affiliate_networks", { _filter: { slug: networkSlug }, _limit: 1 });
  if (networkRes.errors) throw new Error(`networks: ${JSON.stringify(networkRes.errors)}`);
  const network = (networkRes.data || [])[0];
  if (!network) throw new Error(`network "${networkSlug}" not found — run node scripts/seed-offers.mjs first`);

  const offersRes = await sdk.crud.query("affiliate_offers", { _filter: { network: network._id }, _limit: 500 });
  if (offersRes.errors) throw new Error(`offers: ${JSON.stringify(offersRes.errors)}`);
  const byPosition = new Map((offersRes.data || []).map((offer) => [Number(offer.order_position), offer]));

  const rows = OFFERS[networkSlug] || [];
  let renamed = 0;
  let created = 0;
  let skipped = 0;

  for (let index = 0; index < rows.length; index += 1) {
    const [offerName, externalId, payoutModel] = rows[index];
    const position = index + 1;
    const existing = byPosition.get(position);

    if (!existing) {
      const record = await sdk.crud.createRecord("affiliate_offers", {
        offer_name: offerName,
        external_id: externalId,
        payout_model: payoutModel,
        affiliate_url: "",
        network: network._id,
        order_position: position,
        active: "yes",
      });
      if (record.errors) throw new Error(`create ${offerName}: ${JSON.stringify(record.errors)}`);
      console.log(`[sync-offers] + #${position} ${offerName}`);
      created += 1;
      continue;
    }

    if (existing.offer_name === offerName) {
      skipped += 1;
      continue;
    }

    const edit = await sdk.crud.editRecordById("affiliate_offers", existing._id, { offer_name: offerName });
    if (edit.errors) throw new Error(`rename #${position}: ${JSON.stringify(edit.errors)}`);
    console.log(`[sync-offers] #${position} ${existing.offer_name} → ${offerName}`);
    renamed += 1;
  }

  console.log(`[sync-offers] ${network.name}: ${rows.length} in inventory — renamed ${renamed}, created ${created}, already correct ${skipped}`);
}

async function main() {
  for (const network of NETWORKS) await syncNetwork(network.slug);
  console.log("[sync-offers] done");
}

main().catch((err) => {
  console.error("[sync-offers] FATAL:", err);
  process.exit(1);
});
