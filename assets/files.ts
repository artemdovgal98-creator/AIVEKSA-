/**
 * Static asset registry for the project.
 *
 * Every image / logo / icon / SVG used by the app or by the seed scripts is
 * referenced from here — never hardcode an asset path anywhere else.
 */

/** Network brand icons used as the `logo_url` of partner catalog cards. */
export const BRAND_ICONS = {
  crakrevenue: "/brand/crakrevenue-whale.svg",
  awin: "/brand/awin-flame.svg",
  mylead: "/brand/mylead-moneybag.svg",
} as const;

export type BrandIconKey = keyof typeof BRAND_ICONS;

export const FILES = {
  ...BRAND_ICONS,
} as const;
