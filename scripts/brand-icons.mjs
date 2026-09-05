/**
 * AIVEXA — brand icon of every partner network, applied programmatically.
 *
 * A catalog card belongs to a network when its name carries the network prefix
 * ("Crak: ", "Awin: ", "MyLead: "), so nothing is hardcoded per service: the
 * script reads the services from the database and matches by prefix.
 *
 * Icons live in `public/brand` and are registered in `assets/files.ts`.
 * Idempotent — a service that already points at the right icon is skipped.
 *
 * Run: node scripts/brand-icons.mjs
 */
import { createRequire } from "module";
import fs from "fs";
import path from "path";

const require = createRequire(import.meta.url);
const { TotalumApiSdk } = require("totalum-api-sdk");

const envPath = path.resolve(process.cwd(), ".env");
for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
  const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (match) process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
}

const sdk = new TotalumApiSdk({ apiKey: { "api-key": process.env.TOTALUM_API_KEY } });
sdk.changeBaseUrl(process.env.TOTALUM_API_URL || "https://api.totalum.app/");

/** Kept in sync with BRAND_ICONS in assets/files.ts. */
export const BRAND_ICONS = [
  { prefix: "Crak: ", network: "CrakRevenue", icon: "/brand/crakrevenue-whale.svg", label: "кит" },
  { prefix: "Awin: ", network: "Awin", icon: "/brand/awin-flame.svg", label: "огонёк" },
  { prefix: "MyLead: ", network: "MyLead", icon: "/brand/mylead-moneybag.svg", label: "мешок денег" },
];

export async function applyBrandIcons(client = sdk) {
  const result = await client.crud.query("services", { _limit: 1000 });
  if (result.errors) throw new Error(`services: ${JSON.stringify(result.errors)}`);
  const services = result.data || [];

  const summary = [];
  for (const brand of BRAND_ICONS) {
    const matching = services.filter((service) => String(service.name || "").startsWith(brand.prefix));
    let updated = 0;
    let skipped = 0;

    for (const service of matching) {
      if (service.logo_url === brand.icon && service.affiliate_network === brand.network) {
        skipped += 1;
        continue;
      }
      const edit = await client.crud.editRecordById("services", service._id, {
        logo_url: brand.icon,
        affiliate_network: brand.network,
      });
      if (edit.errors) throw new Error(`icon ${service.slug}: ${JSON.stringify(edit.errors)}`);
      updated += 1;
    }

    console.log(
      `[brand-icons] ${brand.network} (${brand.label}): ${matching.length} services — updated ${updated}, already correct ${skipped}`,
    );
    summary.push({ network: brand.network, total: matching.length, updated, skipped });
  }
  return summary;
}

const invokedDirectly = process.argv[1] && process.argv[1].endsWith("brand-icons.mjs");
if (invokedDirectly) {
  applyBrandIcons()
    .then(() => console.log("[brand-icons] done"))
    .catch((err) => {
      console.error("[brand-icons] FATAL:", err);
      process.exit(1);
    });
}
