# AIVEXA — Stage 2: Paddle payments (replaces Stripe)

## Catalog in Paddle (hard-coded, public ids — `src/lib/payments/paddle.ts`)
- Product: `pro_01m3mvbbmpznq55dpqza901y24`
- AIVEXA PRO $9.99 / month (subscription): `pri_01m3mwre7g86an8np11bmx1pby` → plan slug `pro`
- 50 credits $4.99: `pri_01m3mwsmmm9jw349c7xvs65r2t` → pack `starter`
- 150 credits $12.99: `pri_01m3mwtppwp8vdddp4p4z0a3pq` → pack `creator`
- 400 credits $29.99: `pri_01m3mwvxb5p0362wpac43ewrf7` → pack `studio`
Packs can carry their own `paddle_price_id` (Admin → Credit System); packs saved before Paddle fall back to the ids above.
Plan / pack prices in AIVEXA must equal the Paddle prices — the webhook rejects amount mismatches.

## Architecture
- `src/lib/payments/provider.ts` — `PaymentProvider` interface (createCheckout, getPaymentStatus, getTransaction, verifyWebhook, refundPayment, cancelSubscription).
- `src/lib/payments/paddle.ts` — Paddle adapter (HMAC-SHA256 `Paddle-Signature`, 5 min tolerance; API sandbox/live auto-detected).
- `src/lib/billing.ts` — orders, fulfilment, renewals, refunds, cancellation. Provider-neutral.
- `src/lib/paddle-client.ts` — loads Paddle.js and opens the overlay (browser).

## Flow
`POST /api/billing/checkout {plan|pack}` → pending `orders` row (amount, currency, `price_id`, provider `paddle`) →
browser opens Paddle overlay with server-chosen price id + `custom_data {order_id, user_id}` →
`POST /api/paddle/webhook` (`transaction.completed/paid`) → verify signature, order, owner, price id, amount, currency, status →
order `paid` → subscription `active` (end = max(now/current end + duration, Paddle billing period end)) or credits `purchase`.
`/pro/success?order=…` only polls `POST /api/billing/confirm` (owner-only); with `PADDLE_API_KEY` it re-reads the transaction from the Paddle API.

- Renewals: transactions without `order_id` but with `subscription_id` extend the local subscription with that `provider_subscription_id` (deduped by transaction id).
- Refunds: `adjustment.*` with `action=refund, status=approved` → order `refunded` + `refunded_at`; plan → subscription `refunded`; credits → unspent credits removed (never below 0).
- `subscription.canceled` → local subscription `cancelled`, auto-renew off.
- Self-service cancel: Profile → CANCEL SUBSCRIPTION → `POST /api/me/subscription/cancel` → Paddle `cancel` (next_billing_period), `auto_renew=no`, `cancelled_at`, access until `end_date`, logged in `admin_audit_log` (`subscription.self_cancel`).
- Idempotency: `webhook_events` (event id processed once) + order status + per-order in-process lock.
- Admin → Webhooks shows provider status (ENABLED / NOT CONFIGURED / INVALID CONFIGURATION) and the last real events.

## DB changes
- `orders`: `price_id`, `refunded_at`. `subscriptions`: `auto_renew`, `cancelled_at`.
- New `webhook_events` (event_id, provider, event_type, status, result, error, reference_id, occurred_at, order → orders).

## Env (server-only)
- `PADDLE_CLIENT_TOKEN` — Paddle → Developer tools → Authentication → Client-side tokens (`live_…` / `test_…`).
- `PADDLE_WEBHOOK_SECRET` — Paddle → Developer tools → Notifications → destination `https://aivexa.totalum-project.com/api/paddle/webhook` → secret key.
- `PADDLE_API_KEY` — Paddle → Developer tools → Authentication → API keys (needed for self-service cancel, refunds via API, instant confirm).
- Optional `PADDLE_ENVIRONMENT=sandbox|production` (auto-detected otherwise).
Checkout is enabled when the client token + webhook secret are set.

## Home / Telegram
- `HomeProfileBar` at the very top of `/` for signed-in users (avatar, name, PRO status, credits). Avatar link added to the mobile header.
- Telegram bot webhook re-registered to `https://aivexa.totalum-project.com/api/telegram/webhook` (it pointed to an expired preview link).
