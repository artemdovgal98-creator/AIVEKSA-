/**
 * AIVEXA — attributes historic affiliate clicks to their affiliate offer.
 *
 * Before Stage 1 a click through a service-level affiliate link was stored with
 * `service` only. Now that every link lives in `affiliate_offers`, those clicks
 * are linked to the offer whose URL they actually opened. Non-destructive: only
 * the empty `offer` field is filled, and only when the match is unambiguous.
 *
 * Run: node scripts/backfill-click-offers.mjs
 */
import { sdk } from "./_sdk.mjs";

const clean = (v) => String(v || "").trim();
const refId = (v) => (v && typeof v === "object" ? v._id : v) || "";

const offers = [];
for (let offset = 0; ; offset += 500) {
  const page = (await sdk.crud.query("affiliate_offers", { _limit: 500, _offset: offset })).data || [];
  offers.push(...page);
  if (page.length < 500) break;
}
const byService = {};
for (const o of offers) (byService[refId(o.service)] ||= []).push(o);

const clicks = [];
for (let offset = 0; ; offset += 500) {
  const page = (await sdk.crud.query("clicks", { _filter: { affiliate_click: "yes", offer: null }, _limit: 500, _offset: offset })).data || [];
  clicks.push(...page);
  if (page.length < 500) break;
}
console.log("unattributed affiliate clicks:", clicks.length);

let linked = 0, skipped = 0;
const queue = [...clicks];
async function worker() {
  while (queue.length) {
    const click = queue.shift();
    const candidates = byService[refId(click.service)] || [];
    const target = clean(click.target_url);
    const match = candidates.find((o) => clean(o.affiliate_url) && clean(o.affiliate_url) === target)
      || (candidates.length === 1 ? candidates[0] : null);
    if (!match) { skipped++; continue; }
    const r = await sdk.crud.editRecordById("clicks", click._id, { offer: match._id });
    if (r.errors) { console.error("failed", click._id, r.errors); skipped++; continue; }
    linked++;
  }
}
await Promise.all(Array.from({ length: 8 }, worker));
console.log("linked", linked, "skipped", skipped);
