/**
 * URL validation shared by the admin forms (client) and every API route
 * (server — authoritative). Only absolute http(s) URLs with a real host are
 * accepted, so a stored link can never become `javascript:`, `data:` or an
 * internal redirect target.
 */
export function safeHttpUrl(value: unknown): string | null {
  let raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return null;
  if (raw.length > 2048) return null;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(raw)) raw = `https://${raw.replace(/^\/+/, "")}`;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (url.username || url.password) return null;
    const host = url.hostname.toLowerCase();
    if (!host.includes(".") || host.endsWith(".") || host === "localhost") return null;
    if (/^(127\.|10\.|192\.168\.|0\.|169\.254\.)/.test(host)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** Accepted image uploads for catalog services. */
export const IMAGE_MIME_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/**
 * Detects the real image type from the first bytes of a file, so a renamed
 * executable or HTML page can never be stored as an "image".
 */
export function sniffImageType(bytes: Uint8Array): string | null {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 6 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) return "image/gif";
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  )
    return "image/webp";
  return null;
}
