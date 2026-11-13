import { NextResponse } from "next/server";
import { totalumSdk } from "@/lib/totalum";
import { CLICK_ID_PATTERN, normalizeConversionStatus } from "@/lib/affiliate-tracking";
import { findProcessedEvent, recordWebhookEvent } from "@/lib/webhook-events";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Server-to-server conversion postback from an affiliate network:
 *   /api/postback/<network-slug>?token=…&click_id=…&transaction_id=…&payout=…&currency=…&status=…
 * The admin puts the network's own macros into these parameters (see the
 * network's postback docs). A conversion is stored ONLY when the token is valid
 * and the click id belongs to a real click of that network — nothing is invented.
 */

function safeEqual(a: string, b: string): boolean {
  if (!a || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function readParams(request: Request): Promise<URLSearchParams> {
  const params = new URL(request.url).searchParams;
  if (request.method !== "POST") return params;
  const type = request.headers.get("content-type") || "";
  try {
    if (type.includes("application/json")) {
      const body = (await request.json()) as Record<string, unknown>;
      for (const [key, value] of Object.entries(body || {})) if (!params.has(key)) params.set(key, String(value ?? ""));
    } else {
      const body = new URLSearchParams(await request.text());
      body.forEach((value, key) => {
        if (!params.has(key)) params.set(key, value);
      });
    }
  } catch (err) {
    console.error("[postback] unreadable body:", err);
  }
  return params;
}

async function handle(request: Request, slug: string) {
  if (!rateLimit(`postback:${clientIp(request)}`, 120, 60_000)) {
    return NextResponse.json({ ok: false, error: "Too many requests" }, { status: 429 });
  }
  if (!/^[a-z0-9-]{1,60}$/.test(slug)) return NextResponse.json({ ok: false, error: "Unknown network" }, { status: 404 });
  const provider = `affiliate:${slug}`;

  const networkResult = await totalumSdk.crud.query("affiliate_networks", { _filter: { slug }, _limit: 1 });
  if (networkResult.errors) throw new Error("Network lookup failed");
  const network = ((networkResult.data || []) as any[])[0];
  if (!network) return NextResponse.json({ ok: false, error: "Unknown network" }, { status: 404 });

  const params = await readParams(request);
  const secret = String(network.postback_secret || "").trim();
  if (!secret) return NextResponse.json({ ok: false, error: "NOT CONFIGURED" }, { status: 403 });
  if (!safeEqual(params.get("token") || "", secret)) {
    console.warn(`[postback] ${slug}: invalid token`);
    await recordWebhookEvent({ provider, eventId: "", eventType: "postback", status: "invalid_signature", result: "invalid token" });
    return NextResponse.json({ ok: false, error: "Invalid token" }, { status: 401 });
  }

  const clickId = (params.get("click_id") || "").trim().toUpperCase();
  const transactionId = (params.get("transaction_id") || "").trim().slice(0, 120);
  const rawStatus = (params.get("status") || "pending").slice(0, 40);
  const status = normalizeConversionStatus(rawStatus);
  const payoutRaw = params.get("payout");
  const payout = payoutRaw !== null && payoutRaw.trim() !== "" ? Number(payoutRaw) : null;
  const currency = (params.get("currency") || "").trim().toLowerCase().slice(0, 3);

  if (!CLICK_ID_PATTERN.test(clickId) || !/^[\w.:\-]{1,120}$/.test(transactionId)) {
    return NextResponse.json({ ok: false, error: "click_id and transaction_id are required" }, { status: 400 });
  }
  if (payout !== null && (!Number.isFinite(payout) || payout < 0 || payout > 100_000)) {
    return NextResponse.json({ ok: false, error: "Invalid payout" }, { status: 400 });
  }

  const eventId = `${transactionId}:${status.conversion}`;
  if (await findProcessedEvent(provider, eventId)) {
    return NextResponse.json({ ok: true, data: { duplicate: true } });
  }

  // The click must exist and belong to this network — otherwise it is not our conversion.
  const clickResult = await totalumSdk.crud.query("clicks", { _filter: { click_id: clickId }, _limit: 1 });
  if (clickResult.errors) throw new Error("Click lookup failed");
  const click = ((clickResult.data || []) as any[])[0];
  const clickNetwork = click ? String((click.network && typeof click.network === "object" ? click.network._id : click.network) || "") : "";
  if (!click || clickNetwork !== network._id) {
    await recordWebhookEvent({ provider, eventId, eventType: `postback.${status.conversion}`, status: "failed", error: `unknown click ${clickId}`, referenceId: transactionId });
    return NextResponse.json({ ok: false, error: "Unknown click_id" }, { status: 404 });
  }
  const offerId = String((click.offer && typeof click.offer === "object" ? click.offer._id : click.offer) || "");

  const existing = await totalumSdk.crud.query("affiliate_conversions", {
    _filter: { network: network._id, transaction_id: transactionId },
    _limit: 1,
  });
  if (existing.errors) throw new Error("Conversion lookup failed");
  const current = ((existing.data || []) as any[])[0];
  const fields: Record<string, unknown> = {
    status: status.conversion,
    event: rawStatus,
    occurred_at: new Date().toISOString(),
    ...(payout !== null ? { payout } : {}),
    ...(currency ? { currency } : {}),
  };
  const write = current
    ? await totalumSdk.crud.editRecordById("affiliate_conversions", current._id, fields)
    : await totalumSdk.crud.createRecord("affiliate_conversions", {
        ...fields,
        transaction_id: transactionId,
        click_id: clickId,
        click: click._id,
        network: network._id,
        ...(offerId ? { offer: offerId } : {}),
      });
  if (write.errors) {
    console.error("[postback] conversion write failed:", write.errors);
    throw new Error("Conversion write failed");
  }

  // Keep the click-level metrics (EPC / CR / revenue) in sync with the real network status.
  const clickUpdate: Record<string, unknown> = { conversion_status: status.click };
  if (payout !== null && (currency === "usd" || currency === "eur")) {
    clickUpdate.earned_amount = payout;
    clickUpdate.currency = currency;
  }
  const clickWrite = await totalumSdk.crud.editRecordById("clicks", click._id, clickUpdate);
  if (clickWrite.errors) console.error("[postback] click update failed:", clickWrite.errors);

  await recordWebhookEvent({
    provider,
    eventId,
    eventType: `postback.${status.conversion}`,
    status: "processed",
    result: `${current ? "updated" : "created"} · ${payout ?? "N/A"} ${currency.toUpperCase() || ""}`.trim(),
    referenceId: transactionId,
  });
  console.log(`[postback] ${slug} ${transactionId} (${clickId}) → ${status.conversion}`);
  return NextResponse.json({ ok: true, data: { status: status.conversion } });
}

async function route(request: Request, { params }: { params: Promise<{ network: string }> }) {
  const { network } = await params;
  try {
    return await handle(request, network);
  } catch (err: any) {
    console.error(`[postback] ${network} failed:`, err);
    return NextResponse.json({ ok: false, error: "Processing failed" }, { status: 500 });
  }
}

export const GET = route;
export const POST = route;
