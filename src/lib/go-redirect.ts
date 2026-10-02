import "server-only";
import { NextResponse } from "next/server";
import { recordClick } from "@/lib/click-tracking";
import { offerNetwork } from "@/lib/offers";
import { SESSION_COOKIE, newClickId, newSessionId, withClickId } from "@/lib/affiliate-tracking";
import type { AffiliateOfferRecord } from "@/lib/types";

const SESSION_RE = /^[A-Z0-9]{24}$/;

function readCookie(request: Request, name: string): string {
  const header = request.headers.get("cookie") || "";
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return "";
}

/**
 * Final step of /go: (validated DB destination) → click record with click id
 * → redirect. `target` must already be a validated absolute http(s) URL from
 * the database; only the network's documented click-id parameter is added.
 */
export async function trackedRedirect(
  request: Request,
  opts: { target: string; serviceId?: string; offer?: AffiliateOfferRecord | null; countable: boolean }
): Promise<NextResponse> {
  const origin = new URL(request.url).origin;
  const existingSession = readCookie(request, SESSION_COOKIE);
  const sessionId = SESSION_RE.test(existingSession) ? existingSession : newSessionId();

  const offer = opts.offer || null;
  const network = offer ? offerNetwork(offer) : null;
  const clickId = offer ? newClickId() : undefined;
  const destination = clickId ? withClickId(opts.target, network?.subid_param, clickId) : opts.target;

  if (opts.countable) {
    await recordClick({
      serviceId: opts.serviceId,
      offerId: offer?._id,
      networkId: network?._id,
      targetUrl: opts.target,
      affiliate: Boolean(offer),
      clickId,
      sessionId,
      origin,
    });
  }
  if (clickId) {
    console.log(`[go] ${clickId} → ${network?.slug || "network"} (${network?.subid_param ? `passed as ${network.subid_param}` : "not passed: no documented parameter set"})`);
  }

  const response = NextResponse.redirect(destination, 302);
  if (sessionId !== existingSession) {
    response.cookies.set(SESSION_COOKIE, sessionId, {
      httpOnly: true,
      sameSite: "lax",
      secure: origin.startsWith("https://"),
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return response;
}
