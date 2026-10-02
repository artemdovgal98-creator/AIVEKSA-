import "server-only";

/**
 * Affiliate click identity. Every outbound partner click gets a unique
 * `AIVEXA-<year>-XXXXXXXX` id. It is passed to the network ONLY through the
 * parameter documented by that network and entered by the admin on the
 * network (`subid_param`, e.g. subid / sub1 / clickref) — never invented.
 */

export const SESSION_COOKIE = "aivexa_sid";
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomString(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

export function newClickId(): string {
  return `AIVEXA-${new Date().getUTCFullYear()}-${randomString(8)}`;
}

export const CLICK_ID_PATTERN = /^AIVEXA-\d{4}-[A-Z0-9]{8}$/;

export function newSessionId(): string {
  return randomString(24);
}

export const SUBID_PARAM_PATTERN = /^[A-Za-z][A-Za-z0-9_\-[\]]{0,29}$/;

/** Adds the click id under the network's documented parameter; the destination host is never changed. */
export function withClickId(target: string, param: string | undefined | null, clickId: string): string {
  const name = (param || "").trim();
  if (!name || !SUBID_PARAM_PATTERN.test(name)) return target;
  try {
    const url = new URL(target);
    url.searchParams.set(name, clickId);
    return url.toString();
  } catch {
    return target;
  }
}

/** Referrer without query string / fragment (no personal data), and the AIVEXA page it came from. */
export function describeReferrer(referer: string | null, origin: string): { referrer: string; landingPage: string } {
  if (!referer) return { referrer: "", landingPage: "" };
  try {
    const url = new URL(referer);
    const clean = `${url.origin}${url.pathname}`.slice(0, 300);
    return { referrer: clean, landingPage: url.origin === origin ? url.pathname.slice(0, 200) : "" };
  } catch {
    return { referrer: "", landingPage: "" };
  }
}

/** Network-reported status → internal statuses (conversion record + click metrics). */
export function normalizeConversionStatus(raw: string): {
  conversion: "signup" | "pending" | "approved" | "rejected" | "paid";
  click: "pending" | "confirmed" | "paid" | "rejected";
} {
  const value = raw.trim().toLowerCase();
  if (["signup", "lead", "registration", "reg"].includes(value)) return { conversion: "signup", click: "pending" };
  if (["approved", "confirmed", "approve", "accepted", "1"].includes(value)) return { conversion: "approved", click: "confirmed" };
  if (["paid", "payout"].includes(value)) return { conversion: "paid", click: "paid" };
  if (["rejected", "declined", "reversed", "chargeback", "cancelled", "canceled", "2"].includes(value)) {
    return { conversion: "rejected", click: "rejected" };
  }
  return { conversion: "pending", click: "pending" };
}
