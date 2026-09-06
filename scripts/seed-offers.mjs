/**
 * AIVEXA — seeds the three affiliate networks and their whole offer inventory.
 *
 * Idempotent: an offer is matched by (network, external_id) or (network,
 * offer_name) and is never duplicated. Existing `affiliate_url` values entered
 * by the owner are NEVER overwritten.
 *
 * Run: node scripts/seed-offers.mjs
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

async function upsertNetwork(network) {
  const found = await sdk.crud.query("affiliate_networks", { _filter: { slug: network.slug }, _limit: 1 });
  const existing = (found.data || [])[0];
  if (existing) {
    await sdk.crud.editRecordById("affiliate_networks", existing._id, { ...network, active: "yes" });
    console.log(`[seed-offers] network updated: ${network.name}`);
    return existing._id;
  }
  const created = await sdk.crud.createRecord("affiliate_networks", { ...network, active: "yes" });
  if (created.errors) throw new Error(`network ${network.slug}: ${JSON.stringify(created.errors)}`);
  console.log(`[seed-offers] network created: ${network.name}`);
  return created.data.insertedId || created.data._id;
}

async function main() {
  let created = 0;
  let skipped = 0;

  for (const network of NETWORKS) {
    const networkId = await upsertNetwork(network);
    const rows = OFFERS[network.slug] || [];

    const existingRes = await sdk.crud.query("affiliate_offers", {
      _filter: { network: networkId },
      _limit: 1000,
    });
    const existing = existingRes.data || [];
    const byKey = new Set(existing.map((o) => `${o.external_id || ""}|${o.offer_name || ""}`));

    for (let index = 0; index < rows.length; index += 1) {
      const [offerName, externalId, payoutModel] = rows[index];
      const key = `${externalId}|${offerName}`;
      if (byKey.has(key)) {
        skipped += 1;
        continue;
      }
      const record = await sdk.crud.createRecord("affiliate_offers", {
        offer_name: offerName,
        external_id: externalId,
        payout_model: payoutModel,
        affiliate_url: "",
        network: networkId,
        order_position: index + 1,
        active: "yes",
      });
      if (record.errors) {
        console.error(`[seed-offers] failed "${offerName}":`, record.errors);
        throw new Error(`offer ${offerName} failed`);
      }
      byKey.add(key);
      created += 1;
    }
    console.log(`[seed-offers] ${network.name}: ${rows.length} offers in inventory`);
  }

  const total = await sdk.crud.query("affiliate_offers", { _aggregate: { _count: true } });
  console.log(`[seed-offers] done — created ${created}, already present ${skipped}`);
  console.log("[seed-offers] total offers in database:", JSON.stringify(total.data));
}

main().catch((err) => {
  console.error("[seed-offers] FATAL:", err);
  process.exit(1);
});
