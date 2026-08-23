import { getBanners } from "@/lib/catalog";
import type { BannerRecord } from "@/lib/types";

/**
 * Advertising slot. Renders nothing unless an admin activated a banner for
 * this position — advertising is off by default.
 */
export async function AdBanner({ position }: { position: NonNullable<BannerRecord["position"]> }) {
  const banners = await getBanners(position);
  const banner = banners[0];
  if (!banner?.banner_image || !banner?.banner_url) return null;

  return (
    <a
      href={banner.banner_url}
      target="_blank"
      rel="nofollow sponsored noopener noreferrer"
      className="glass glass-hover block overflow-hidden rounded-2xl"
    >
      <img src={banner.banner_image} alt={banner.title || "Ad"} className="h-auto w-full object-cover" />
      {banner.title && <p className="px-4 py-3 text-sm text-foreground/70">{banner.title}</p>}
    </a>
  );
}
