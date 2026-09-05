/**
 * AIVEXA — renames the Awin inventory to the prefixed catalog names
 * ("Awin: 3DMakerpro Global", …) so the network is obvious in the admin panel.
 *
 * The name list is NOT hardcoded here: it is read from `scripts/offers-data.mjs`
 * (the single source of truth for the offer inventory) and matched against the
 * database by `order_position` inside the Awin network. Missing positions are
 * created. Idempotent — an offer that already carries the right name is skipped,
 * and the owner's `affiliate_url` is never touched.
 *
 * Run: node scripts/prefix-awin-names.mjs
 */
import { createRequire } from "module";
import fs from "fs";
import path from "path";
import { OFFERS } from "./offers-data.mjs";

const require = createRequire(import.meta.url);
const { TotalumApiSdk } = require("totalum-api-sdk");

const envPath = path.resolve(process.cwd(), ".env");
for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
  const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (match) process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
}

const sdk = new TotalumApiSdk({ apiKey: { "api-key": process.env.TOTALUM_API_KEY } });
sdk.changeBaseUrl(process.env.TOTALUM_API_URL || "https://api.totalum.app/");

const NETWORK_SLUG = "awin";

async function main() {
  const networkRes = await sdk.crud.query("affiliate_networks", { _filter: { slug: NETWORK_SLUG }, _limit: 1 });
  if (networkRes.errors) throw new Error(`networks: ${JSON.stringify(networkRes.errors)}`);
  const network = (networkRes.data || [])[0];
  if (!network) throw new Error(`network "${NETWORK_SLUG}" not found`);

  const offersRes = await sdk.crud.query("affiliate_offers", { _filter: { network: network._id }, _limit: 500 });
  if (offersRes.errors) throw new Error(`offers: ${JSON.stringify(offersRes.errors)}`);
  const offers = offersRes.data || [];
  const byPosition = new Map(offers.map((offer) => [Number(offer.order_position), offer]));

  const rows = OFFERS[NETWORK_SLUG] || [];
  console.log(`[prefix-awin] network "${network.name}" — ${offers.length} offers in database, ${rows.length} in inventory`);

  let renamed = 0;
  let createdCount = 0;
  let skipped = 0;

  for (let index = 0; index < rows.length; index += 1) {
    const [offerName, externalId, payoutModel] = rows[index];
    const position = index + 1;
    const existing = byPosition.get(position);

    if (!existing) {
      const created = await sdk.crud.createRecord("affiliate_offers", {
        offer_name: offerName,
        external_id: externalId,
        payout_model: payoutModel,
        affiliate_url: "",
        network: network._id,
        order_position: position,
        active: "yes",
      });
      if (created.errors) throw new Error(`create ${offerName}: ${JSON.stringify(created.errors)}`);
      console.log(`[prefix-awin] + created #${position} ${offerName}`);
      createdCount += 1;
      continue;
    }

    if (existing.offer_name === offerName) {
      skipped += 1;
      continue;
    }

    const result = await sdk.crud.editRecordById("affiliate_offers", existing._id, { offer_name: offerName });
    if (result.errors) throw new Error(`rename #${position}: ${JSON.stringify(result.errors)}`);
    console.log(`[prefix-awin] #${position} ${existing.offer_name} → ${offerName}`);
    renamed += 1;
  }

  console.log(`[prefix-awin] done — renamed ${renamed}, created ${createdCount}, already correct ${skipped}`);
}

main().catch((err) => {
  console.error("[prefix-awin] FATAL:", err);
  process.exit(1);
});
