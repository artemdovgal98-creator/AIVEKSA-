import { getBanners } from "@/lib/catalog";
import { bannerImage } from "@/lib/localize";
import type { BannerRecord } from "@/lib/types";

/**
 * Advertising slot. Renders nothing unless an admin activated a banner for
 * this position — advertising is off by default.
 */
export async function AdBanner({ position }: { position: NonNullable<BannerRecord["position"]> }) {
  const banners = await getBanners(position);
  // The first banner with a usable image (uploaded file first) and a target URL.
  const banner = banners.find((entry) => bannerImage(entry) && entry.banner_url);
  if (!banner) return null;

  const image = bannerImage(banner);
  console.log(`[ad-banner] rendering "${banner.title || banner._id}" at ${position}`);

  return (
    <a
      href={banner.banner_url}
      target="_blank"
      rel="nofollow sponsored noopener noreferrer"
      className="glass glass-hover block min-w-0 overflow-hidden rounded-2xl"
    >
      <img src={image} alt={banner.title || "Ad"} className="h-auto w-full max-w-full object-cover" />
      {banner.title && <p className="break-anywhere px-4 py-3 text-sm text-foreground/70">{banner.title}</p>}
    </a>
  );
}
