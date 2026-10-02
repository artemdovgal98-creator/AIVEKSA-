import "server-only";

/**
 * Small in-memory fixed-window rate limiter for sensitive endpoints.
 * It is per server instance (good enough to stop bursts and scripted abuse);
 * the authoritative checks — auth, ownership, validation — still run on every call.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function clientIp(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
    "unknown"
  );
}

/** Returns true when the call is allowed. */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 5000) {
      for (const [entryKey, entry] of buckets) if (entry.resetAt <= now) buckets.delete(entryKey);
    }
    return true;
  }
  bucket.count += 1;
  if (bucket.count > limit) {
    console.warn("[rate-limit] blocked", key);
    return false;
  }
  return true;
}
