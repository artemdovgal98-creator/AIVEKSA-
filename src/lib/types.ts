// Database record types — mirror of the Totalum schema (snake_case fields)

export type Lang = "ru" | "uk" | "en";
export type YesNo = "yes" | "no";

export interface CategoryRecord {
  _id: string;
  slug: string;
  name_ru?: string;
  name_uk?: string;
  name_en?: string;
  icon?: string;
  keywords?: string;
  order_position?: number;
  active?: YesNo;
  createdAt?: string;
  updatedAt?: string;
}

/** State of the affiliate partnership for a service. */
export type AffiliateStatus =
  | "not_connected"
  | "pending"
  | "connected"
  | "rejected"
  | "not_available";

export const AFFILIATE_STATUSES: AffiliateStatus[] = [
  "not_connected",
  "pending",
  "connected",
  "rejected",
  "not_available",
];

export interface ServiceRecord {
  _id: string;
  name: string;
  slug: string;
  /** string id when not expanded, object when expanded through query() */
  category?: string | CategoryRecord | null;
  logo_url?: string;
  official_url?: string;
  affiliate_url?: string;
  is_affiliate?: YesNo;
  /** Official page of the service affiliate program — never invented. */
  affiliate_program_url?: string;
  affiliate_network?: string;
  commission?: string;
  affiliate_status?: AffiliateStatus;
  affiliate_notes?: string;
  free_plan?: YesNo;
  pricing_type?: "free" | "freemium" | "paid";
  pricing?: string;
  rating?: number;
  popularity?: number;
  views?: number;
  tags?: string;
  keywords?: string;
  description_ru?: string;
  description_uk?: string;
  description_en?: string;
  features_ru?: string;
  features_uk?: string;
  features_en?: string;
  pros_ru?: string;
  pros_uk?: string;
  pros_en?: string;
  cons_ru?: string;
  cons_uk?: string;
  cons_en?: string;
  featured?: YesNo;
  popular?: YesNo;
  active?: YesNo;
  createdAt?: string;
  updatedAt?: string;
}

/** Payment state of a real commission reported by an affiliate network. */
export type ConversionStatus = "pending" | "confirmed" | "paid" | "rejected";

export const CONVERSION_STATUSES: ConversionStatus[] = ["pending", "confirmed", "paid", "rejected"];

/** Statuses that represent money the owner actually received / will receive. */
export const EARNED_STATUSES: ConversionStatus[] = ["confirmed", "paid"];

export type Currency = "usd" | "eur";

export const CURRENCIES: Currency[] = ["usd", "eur"];

export interface ClickRecord {
  _id: string;
  service?: string | ServiceRecord | null;
  user?: string | { _id: string; name?: string; email?: string } | null;
  clicked_at?: string;
  language?: string;
  device?: "mobile" | "tablet" | "desktop";
  country?: string;
  target_url?: string;
  affiliate_click?: YesNo;
  /** Real commission reported for this click — stays empty until money is reported. */
  earned_amount?: number;
  conversion_status?: ConversionStatus;
  currency?: Currency;
  /**
   * "yes" = commission entered by the admin / pushed by an affiliate webhook,
   * not a real visitor click. Excluded from every click counter.
   */
  manual_entry?: YesNo;
  createdAt?: string;
}

export interface FavoriteRecord {
  _id: string;
  user?: string | null;
  service?: string | ServiceRecord | null;
  saved_at?: string;
}

export interface ArticleRecord {
  _id: string;
  title: string;
  slug: string;
  description?: string;
  content?: string;
  image_url?: string;
  category?: string | CategoryRecord | null;
  language?: Lang;
  published?: YesNo;
  author?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface BannerRecord {
  _id: string;
  title?: string;
  banner_image?: string;
  banner_url?: string;
  position?: "home_top" | "home_bottom" | "catalog" | "service_page";
  active?: YesNo;
}

export interface AdminSettingRecord {
  _id: string;
  setting_key: string;
  setting_value?: string;
  description?: string;
}
