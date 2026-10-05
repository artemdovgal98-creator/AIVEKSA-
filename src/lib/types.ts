// Database record types — mirror of the Totalum schema (snake_case fields)

export type Lang = "ru" | "uk" | "en";
export type YesNo = "yes" | "no";

/**
 * A file stored by Totalum. `name` is the internal id, `url` is the signed URL
 * that must ALWAYS be used to display or download the file.
 */
export interface TotalumFile {
  name: string;
  url?: string;
}

/** First usable URL of a single/multiple Totalum file field. */
export function fileUrl(field: TotalumFile | TotalumFile[] | null | undefined): string {
  if (!field) return "";
  const first = Array.isArray(field) ? field[0] : field;
  return first?.url || "";
}

/** Every usable URL of a multiple Totalum file field. */
export function fileUrls(field: TotalumFile | TotalumFile[] | null | undefined): string[] {
  if (!field) return [];
  const list = Array.isArray(field) ? field : [field];
  return list.map((entry) => entry?.url || "").filter(Boolean);
}

/** Hard limit for every upload in the app — 10 MB per file. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** Maximum number of custom logos on a catalog service. */
export const MAX_SERVICE_LOGOS = 3;

/** Maximum number of photos on a user profile. */
export const MAX_PROFILE_PHOTOS = 3;

/**
 * Normalises what a client sends for a multiple-file field into the shape
 * Totalum expects. The client always posts the COMPLETE list it wants to keep,
 * so removing an entry is simply posting a shorter array.
 */
export function toFileLinks(value: any, max: number): { name: string }[] {
  if (!Array.isArray(value)) return [];
  const names: string[] = [];
  for (const entry of value) {
    const name = typeof entry === "string" ? entry : entry?.name;
    if (typeof name === "string" && name.trim() && !names.includes(name.trim())) {
      names.push(name.trim());
    }
  }
  return names.slice(0, max).map((name) => ({ name }));
}

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
  /** Custom logos uploaded by the owner — the first one overrides `logo_url`. */
  logo_files?: TotalumFile[] | null;
  title_ru?: string;
  title_uk?: string;
  title_en?: string;
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
  /** Expanded by some catalog queries — technical affiliate data lives on the offers. */
  affiliate_offers?: AffiliateOfferRecord[] | null;
  /** Computed server-side: live primary offer used by the partner button (never stored). */
  partner_offer?: { slug: string; sponsored: boolean } | null;
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
  /** Uploaded cover; takes priority over `image_url`. */
  cover?: TotalumFile | null;
  category?: string | CategoryRecord | null;
  language?: Lang;
  published?: YesNo;
  author?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export const BANNER_POSITIONS = ["home_top", "home_bottom", "catalog", "service_page"] as const;
export type BannerPosition = (typeof BANNER_POSITIONS)[number];

export interface BannerRecord {
  _id: string;
  title?: string;
  /** External image URL — used only when no file was uploaded. */
  banner_image?: string;
  /** Uploaded image; takes priority over `banner_image`. */
  banner_file?: TotalumFile | null;
  banner_url?: string;
  position?: BannerPosition;
  order_position?: number;
  active?: YesNo;
  createdAt?: string;
}

/** Kind of entry in the AI Radar feed. */
export const RADAR_TYPES = ["model", "tool", "update", "research", "funding", "trend"] as const;
export type RadarType = (typeof RADAR_TYPES)[number];

export const RADAR_IMPORTANCES = ["low", "normal", "high"] as const;
export type RadarImportance = (typeof RADAR_IMPORTANCES)[number];

/** One item of the AI Radar feed, fully managed from the admin panel. */
export interface RadarRecord {
  _id: string;
  title_ru?: string;
  title_uk?: string;
  title_en?: string;
  summary_ru?: string;
  summary_uk?: string;
  summary_en?: string;
  radar_type?: RadarType;
  importance?: RadarImportance;
  source_name?: string;
  source_url?: string;
  image_url?: string;
  cover?: TotalumFile | null;
  published_at?: string;
  pinned?: YesNo;
  active?: YesNo;
  order_position?: number;
  service?: string | ServiceRecord | null;
  category?: string | CategoryRecord | null;
  createdAt?: string;
  updatedAt?: string;
}

/** Public profile + contact block of a site user (the owner's is shown on the home page). */
export interface UserProfileRecord {
  _id: string;
  name?: string;
  email?: string;
  role?: string;
  language?: string | null;
  image?: string;
  title_ru?: string;
  title_uk?: string;
  title_en?: string;
  bio_ru?: string;
  bio_uk?: string;
  bio_en?: string;
  photos?: TotalumFile[] | null;
  link_1?: string;
  link_2?: string;
  link_3?: string;
  link_4?: string;
  link_5?: string;
  phone_1?: string;
  phone_2?: string;
  telegram_url?: string;
  twitter_url?: string;
  tiktok_url?: string;
  facebook_url?: string;
  instagram_url?: string;
  youtube_url?: string;
  linkedin_url?: string;
  discord_url?: string;
  website_url?: string;
  show_contacts?: YesNo;
  referral_code?: string;
  referrals_count?: number;
  createdAt?: string;
}

/** Profile fields the owner edits — used by the profile form and the API. */
export const PROFILE_TEXT_FIELDS = [
  "title_ru", "title_uk", "title_en",
  "bio_ru", "bio_uk", "bio_en",
  "phone_1", "phone_2",
] as const;

export const PROFILE_LINK_FIELDS = [
  "link_1", "link_2", "link_3", "link_4", "link_5",
  "telegram_url", "twitter_url", "tiktok_url", "facebook_url",
  "instagram_url", "youtube_url", "linkedin_url", "discord_url", "website_url",
] as const;

export const SOCIAL_FIELDS = [
  "telegram_url", "twitter_url", "tiktok_url", "facebook_url",
  "instagram_url", "youtube_url", "linkedin_url", "discord_url", "website_url",
] as const;
export type SocialField = (typeof SOCIAL_FIELDS)[number];

export interface AdminSettingRecord {
  _id: string;
  setting_key: string;
  setting_value?: string;
  description?: string;
}

/** Payout model of an affiliate offer, exactly as the network labels it. */
export type PayoutModel = "pps" | "revshare" | "multi_cpa" | "smartlink" | "cpa" | "other";

export const PAYOUT_MODELS: PayoutModel[] = ["pps", "revshare", "multi_cpa", "smartlink", "cpa", "other"];

/** One of the three affiliate networks the offers are split into. */
export interface AffiliateNetworkRecord {
  _id: string;
  name: string;
  slug: string;
  website?: string;
  description?: string;
  /** HEX accent used by the admin badges. */
  accent_color?: string;
  order_position?: number;
  active?: YesNo;
  /** Documented tracking parameter of the network that carries our click id (subid, sub1, clickref…). */
  subid_param?: string;
  /** Server-only token required on incoming postbacks. Never sent to the browser. */
  postback_secret?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * A single offer inside a network. `affiliate_url` is the unique tracking link
 * the owner pastes in the admin panel — every outbound click uses it.
 */
export interface AffiliateOfferRecord {
  _id: string;
  offer_name: string;
  /** Offer ID inside the network (e.g. CrakRevenue 10335). Empty for networks without public IDs. */
  external_id?: string;
  affiliate_url?: string;
  payout_model?: PayoutModel;
  /** string id when not expanded, object when expanded through query() */
  network?: string | AffiliateNetworkRecord | null;
  /** Optional binding to a catalog AI — its "Try it" button then uses this link. */
  service?: string | ServiceRecord | null;
  notes?: string;
  order_position?: number;
  active?: YesNo;
  /** Health status — see OFFER_STATUSES. Broken offers are never deleted automatically. */
  status?: OfferStatus;
  tracking_url?: string;
  /** Configured payout per conversion (what the network pays), not revenue. */
  payout?: number;
  /** One service can have many offers; the primary one powers its partner button. */
  is_primary?: YesNo;
  sponsored?: YesNo;
  /** Public redirect: /go/<offer_slug>. */
  offer_slug?: string;
  quality_score?: number;
  last_checked_at?: string;
  health_note?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const OFFER_STATUSES = [
  "active",
  "tracking_ok",
  "tracking_unknown",
  "needs_review",
  "broken",
  "inactive",
] as const;
export type OfferStatus = (typeof OFFER_STATUSES)[number];

/** Statuses under which an offer may send real visitors to its affiliate URL. */
export const LIVE_OFFER_STATUSES: OfferStatus[] = ["active", "tracking_ok", "tracking_unknown"];

// ---------------------------------------------------------------------------
// Monetisation: plans, subscriptions, orders, AI credits
// ---------------------------------------------------------------------------

/** Access types checked by the backend. `main_catalog` is ALWAYS free. */
export const PLAN_ACCESS_RULES = [
  "pro",
  "social_studio",
  "content_generator",
  "radar_analytics",
  "no_ads",
  "priority_credits",
] as const;
export type PlanAccessRule = (typeof PLAN_ACCESS_RULES)[number];
export type AccessType = "main_catalog" | PlanAccessRule;

export interface PlanRecord {
  _id: string;
  name: string;
  slug: string;
  price?: number;
  currency?: Currency;
  duration_days?: number;
  description?: string;
  features?: string;
  access_rules?: PlanAccessRule[] | null;
  ai_credits?: number;
  social_limit?: number;
  publishing_limit?: number;
  scheduling?: YesNo;
  analytics?: YesNo;
  order_position?: number;
  active?: YesNo;
  createdAt?: string;
  updatedAt?: string;
}

export const SUBSCRIPTION_STATUSES = ["active", "expired", "cancelled", "pending", "paid", "refunded"] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export interface SubscriptionRecord {
  _id: string;
  user?: string | { _id: string; name?: string; email?: string } | null;
  plan?: string | PlanRecord | null;
  order?: string | OrderRecord | null;
  status?: SubscriptionStatus;
  start_date?: string;
  end_date?: string;
  provider?: string;
  provider_subscription_id?: string;
  auto_renew?: YesNo;
  cancelled_at?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const ORDER_STATUSES = ["pending", "paid", "failed", "cancelled", "refunded"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export interface OrderRecord {
  _id: string;
  order_number?: string;
  user?: string | { _id: string; name?: string; email?: string } | null;
  plan?: string | PlanRecord | null;
  amount?: number;
  currency?: Currency;
  status?: OrderStatus;
  provider?: string;
  provider_payment_id?: string;
  price_id?: string;
  description?: string;
  paid_at?: string;
  refunded_at?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const CREDIT_TRANSACTION_TYPES = [
  "purchase",
  "subscription",
  "usage",
  "refund",
  "bonus",
  "admin_adjustment",
] as const;
export type CreditTransactionType = (typeof CREDIT_TRANSACTION_TYPES)[number];

export interface CreditAccountRecord {
  _id: string;
  user?: string | { _id: string; name?: string; email?: string } | null;
  balance?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreditTransactionRecord {
  _id: string;
  user?: string | { _id: string; name?: string; email?: string } | null;
  amount?: number;
  type?: CreditTransactionType;
  balance_after?: number;
  reference_id?: string;
  description?: string;
  createdAt?: string;
}

export interface AuditLogRecord {
  _id: string;
  admin?: string | { _id: string; name?: string; email?: string } | null;
  action?: string;
  target_type?: string;
  target_id?: string;
  details?: string;
  createdAt?: string;
}

/** Affiliate ranking weights in percent (configurable in Admin → Affiliate Marketplace). */
export interface RankingWeights {
  relevance: number;
  performance: number;
  cr: number;
  epc: number;
  payout: number;
  popularity: number;
  quality: number;
}

export const DEFAULT_RANKING_WEIGHTS: RankingWeights = {
  relevance: 45,
  performance: 20,
  cr: 10,
  epc: 10,
  payout: 5,
  popularity: 5,
  quality: 5,
};

/** Kind of free material the Telegram bot delivers. */
export type FolderContentType = "prompts" | "guide" | "instruction";

/** `free` is handed out immediately, `referral` needs invited friends. */
export type FolderAccessType = "free" | "referral";

export interface PromptFolderRecord {
  _id: string;
  title: string;
  slug?: string;
  description?: string;
  /** Emoji shown on the bot menu button. */
  icon?: string;
  content_type?: FolderContentType;
  /** Message body the bot sends when the material is unlocked. */
  content?: string;
  /** Totalum file field — always displayed/sent through its `url`. */
  file?: { name: string; url: string } | null;
  external_url?: string;
  access_type?: FolderAccessType;
  required_referrals?: number;
  order_position?: number;
  active?: YesNo;
  createdAt?: string;
  updatedAt?: string;
}

export interface TelegramUserRecord {
  _id: string;
  telegram_id: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  language_code?: string;
  referral_code?: string;
  referrals_count?: number;
  started_at?: string;
  last_active_at?: string;
  blocked?: YesNo;
  /** Linked site account, set when the visitor connects Telegram from /referrals. */
  user?: string | { _id: string; name?: string; email?: string } | null;
  /** The subscriber whose referral link brought this person. */
  invited_by?: string | TelegramUserRecord | null;
  createdAt?: string;
}

export interface TelegramDeliveryRecord {
  _id: string;
  telegram_user?: string | TelegramUserRecord | null;
  folder?: string | PromptFolderRecord | null;
  delivered_at?: string;
  delivery_reason?: "request" | "referral_reward" | "welcome";
}

/** Bot configuration stored in `admin_settings`. */
export interface TelegramBotSettings {
  token: string;
  username: string;
  secret: string;
  welcome: string;
  webhookUrl: string;
  /**
   * Public address of the site, set in the admin panel. The temporary preview
   * link must never be baked in, so the bot buttons rely on this value.
   */
  publicUrl: string;
}
