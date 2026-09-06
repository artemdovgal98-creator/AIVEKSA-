/**
 * AIVEXA — prefixes every CrakRevenue catalog entry with "Crak: " so the
 * network is obvious in the catalog and in the admin panel.
 *
 * Fully programmatic: it reads the services of the `companions` category from
 * the database, no name list is hardcoded here. Idempotent — a service that is
 * already prefixed is left untouched. `keywords` are NOT changed, so search by
 * the original name keeps working.
 *
 * Run: node scripts/prefix-crak-names.mjs
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

const PREFIX = "Crak: ";
const CATEGORY_SLUG = "companions";

async function main() {
  const categoryRes = await sdk.crud.query("categories", { _filter: { slug: CATEGORY_SLUG }, _limit: 1 });
  if (categoryRes.errors) throw new Error(`categories: ${JSON.stringify(categoryRes.errors)}`);
  const category = (categoryRes.data || [])[0];
  if (!category) throw new Error(`category "${CATEGORY_SLUG}" not found`);

  const servicesRes = await sdk.crud.query("services", { _filter: { category: category._id }, _limit: 500 });
  if (servicesRes.errors) throw new Error(`services: ${JSON.stringify(servicesRes.errors)}`);
  const services = servicesRes.data || [];
  console.log(`[prefix-crak] category "${category.name_ru}" — ${services.length} services found`);

  let renamed = 0;
  let skipped = 0;

  for (const service of services) {
    const name = String(service.name || "");
    if (name.startsWith(PREFIX)) {
      skipped += 1;
      continue;
    }
    const next = `${PREFIX}${name}`;
    const result = await sdk.crud.editRecordById("services", service._id, { name: next });
    if (result.errors) throw new Error(`rename ${service.slug}: ${JSON.stringify(result.errors)}`);
    console.log(`[prefix-crak] ${name} → ${next}`);
    renamed += 1;
  }

  console.log(`[prefix-crak] done — renamed ${renamed}, already prefixed ${skipped}`);
}

main().catch((err) => {
  console.error("[prefix-crak] FATAL:", err);
  process.exit(1);
});
