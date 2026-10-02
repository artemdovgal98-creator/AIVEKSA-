# AIVEXA — Stage 1: Core + Catalog + Affiliate Marketplace + Admin

Applied on top of the existing production project (no data removed, all URLs kept).

## Access model
- **Main AI catalog — FREE**, public, indexable. `hasAccess(user, "main_catalog")` is always `true` (`src/lib/access.ts`).
- **AIVEXA PRO** — paid plan from the `plans` table (default $9.99 / 30 days, editable in Admin → Plans).
  `hasAccess(user, "pro")` = an active/paid, non-expired subscription whose plan `access_rules` include `pro`.
- **AIVEXA CREDITS** — separate ledger (`src/lib/credits.ts`): `ai_credit_accounts` + `ai_credit_transactions`.
  Balance never negative, every change is logged, `withCredits()` refunds on failure.
- The Affiliate Marketplace is **not** a paid tier.

## Billing (Stripe — replaced by Paddle in Stage 2, see stage2-paddle-payments.md)
- `POST /api/billing/checkout {plan}` → pending `orders` record + Stripe Checkout (price read from the DB).
  Returns `NOT_CONFIGURED` (503) while `STRIPE_SECRET_KEY` is missing.
- Fulfilment `fulfilCheckoutSession()` (`src/lib/billing.ts`) re-reads the session from Stripe, checks amount/currency,
  marks the order `paid`, creates/extends the subscription and grants plan credits (type `subscription`). Idempotent.
  Called from the webhook (`checkout.session.*`) and from `/pro/success` via `POST /api/billing/confirm`.

## Affiliate Marketplace
- Single source of truth: `affiliate_offers` (status, is_primary, sponsored, offer_slug, payout, quality_score, tracking_url, health).
- Partner button → `/go/{offer_slug}`; `/go/{service_slug}` and `/go/offer/{id}` still work. Destinations only from the DB, validated by `safeHttpUrl`.
- Offers are never deleted automatically — DELETE archives (`inactive`), deleting a service moves its offers to `needs_review`.
- Metrics from `clicks` (attributed via `clicks.offer`): clicks, conversions, revenue per currency, EPC, CR, CTR (= clicks / AI page views).
- Ranking (`src/lib/ranking.ts`): weights in `admin_settings.affiliate_ranking_weights` (default 45/20/10/10/5/5/5),
  relevance tiers first, relevance weight ≥ payout, max one SPONSORED slot, hourly rotation.

## Admin
Menu: Dashboard, Users, Plans, Orders, Subscriptions, Transactions, Payments, AI Catalog, Categories,
Affiliate Marketplace, Social Studio/Zernio (NOT CONFIGURED — Stage 2), Credit System, Telegram Bot, Webhooks,
System Settings (+ content: Radar, Articles, Banners, Clicks). Every manual change is written to `admin_audit_log`.
- AI Catalog form = exactly 6 fields (`src/lib/service-form.ts`).
- Categories: delete of a used category requires `?reassignTo=<id|none>`.
- Plans with history are deactivated instead of deleted.

## Scripts
- `scripts/migrate-stage1.mjs` — idempotent data migration (networks, offer normalisation, service links → offers, PRO plan, weights).
- `scripts/backfill-click-offers.mjs` — links historic affiliate clicks to offers.

## Environment variables
- `STRIPE_SECRET_KEY` — required to enable PRO payments (Stripe Dashboard → Developers → API keys).
- `ZERNIO_API_KEY` — Stage 2 (Social Studio).

## Continuation (no Stripe key required)

- **AI Studio** (`/pro/studio`, API `/api/pro/generate`): PRO content generator on the built-in Totalum AI.
  Formats and credit costs live in `src/lib/pro-studio.ts` (article 5, campaign 4, video 4, email 3, ads 3, plan 5).
  Access = plan rule `pro` or `content_generator`. Credits are debited via `withCredits` and refunded if the AI call fails;
  402 `NO_CREDITS`, 403 `PRO_REQUIRED`, 401 `AUTH_REQUIRED`, rate limit 10/min.
- **hasAccess** now checks any plan rule (`no_ads`, `content_generator`, `social_studio`, …), not only `pro`.
- **No ads**: `AdBanner` renders nothing for users whose active plan has `no_ads` (checked once per request with React `cache`).
- **Frequency capping**: cookie `aivexa_seen_offers` (last 12 featured offer slugs, 6 h) written by `SeenOffersCookie`,
  read on the home page and passed to `rankFeaturedAffiliate({ recentlyShown })` (−0.12 score penalty).
- **Telegram Mini App**: light `HapticFeedback.impactOccurred` on taps of links/buttons, only inside Telegram.
- Without `STRIPE_SECRET_KEY`, PRO can be granted manually in Admin → Users → grant plan (credits are granted too).

## Credit packs (one-time purchase)

- Packs live in `admin_settings.credit_packs` (JSON), defaults in `src/lib/credit-packs.ts`: 50 / $4.99, 150 / $12.99, 400 / $29.99.
  Edited in Admin → Credit System (`/api/admin/credit-packs`, validated, audited as `credit_packs.update`).
- `/pro#credits` shows the packs; `POST /api/billing/checkout { pack }` → Stripe Checkout (price from the server only).
- Fulfilment reuses `fulfilCheckoutSession`: session metadata `kind=credits` → ledger entry type `purchase` (reference = order id). Idempotent via the order `paid` status.
- Without `STRIPE_SECRET_KEY` the buttons are disabled and marked NOT CONFIGURED.
