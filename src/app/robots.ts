import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/**
 * Dynamic robots.txt — keeps the explicit allowances for the main crawlers and
 * social preview bots, hides private areas, and always points at the sitemap of
 * the current deployment URL.
 */
export default function robots(): MetadataRoute.Robots {
  const disallow = ["/admin", "/admin/", "/api/", "/profile", "/favorites", "/go/"];

  return {
    rules: [
      { userAgent: "Googlebot", allow: "/", disallow },
      { userAgent: "Bingbot", allow: "/", disallow },
      { userAgent: "Twitterbot", allow: "/" },
      { userAgent: "facebookexternalhit", allow: "/" },
      { userAgent: "*", allow: "/", disallow },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
