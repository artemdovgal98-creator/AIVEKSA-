import type { Money } from "@/lib/money";
import type { RankingWeights } from "@/lib/types";

export interface MarketOffer {
  _id: string;
  offer_name: string;
  external_id: string;
  offer_slug: string;
  affiliate_url: string;
  tracking_url: string;
  status: string;
  active: string;
  live: boolean;
  is_primary: string;
  sponsored: string;
  payout: number | null;
  payout_model: string;
  quality_score: number | null;
  last_checked_at: string | null;
  health_note: string;
  notes: string;
  network: { _id: string; name: string; slug: string; accent_color: string } | null;
  service: { _id: string; slug: string; title: string; is_affiliate: string; views: number } | null;
  metrics: {
    clicks: number;
    conversions: number;
    pending: number;
    revenue: Money;
    epc: Money | null;
    cr: number | null;
    ctr: number | null;
    revenueScalar: number;
  };
}

export interface MarketNetwork {
  _id: string;
  name: string;
  slug: string;
  accent_color: string;
  website: string;
  active: string;
  offers: number;
  live: number;
  clicks: number;
  conversions: number;
  revenue: Money;
  cr: number | null;
}

export interface MarketData {
  offers: MarketOffer[];
  networks: MarketNetwork[];
  summary: {
    offers: number;
    live: number;
    services: number;
    needsReview: number;
    broken: number;
    sponsored: number;
    clicks: number;
    conversions: number;
    pending: number;
    revenue: Money;
    epc: Money | null;
    cr: number | null;
    ctr: number | null;
  };
  weights: RankingWeights;
}

export const pct = (value: number | null | undefined) =>
  value === null || value === undefined ? "N/A" : `${(value * 100).toFixed(2)}%`;
