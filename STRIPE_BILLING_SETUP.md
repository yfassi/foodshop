# Stripe Billing Setup

TaapR's platform subscriptions (Le Plat / Le Menu / Carte Blanche + add-ons)
run on Stripe Billing. This document walks through the one-time setup.

> Note: this is **separate from Stripe Connect** (which routes order payments
> to each restaurant). Connect uses each restaurant's own Stripe account; the
> platform subscription billed below charges the restaurant owner *as a
> customer of TaapR*.

## 1. Apply migrations 016 and 017

Migration 016 (already in this repo) aligns tier values with `plat | menu | carte`
and adds module flags / floor plan / API keys. Migration 017 adds the Stripe
Customer + Subscription bookkeeping columns.

```bash
DB_PASSWORD='…' node scripts/apply-migration.mjs 016_pricing_tiers_and_modules.sql
DB_PASSWORD='…' node scripts/apply-migration.mjs 017_stripe_billing.sql
```

(Get `DB_PASSWORD` from Supabase Dashboard → Settings → Database.)

## 2. Create Products and Prices in Stripe

Either run the helper script (recommended — idempotent):

```bash
STRIPE_SECRET_KEY=sk_test_… node scripts/setup-stripe-products.mjs
# Optional dry-run first:
STRIPE_SECRET_KEY=sk_test_… node scripts/setup-stripe-products.mjs --dry-run
# Add annual prices alongside monthly:
STRIPE_SECRET_KEY=sk_test_… node scripts/setup-stripe-products.mjs --annual
```

The script prints the env var lines to paste into `.env.local`. It looks up
products by `metadata.taapr_id` so re-running is safe.

Or do it manually in the Stripe Dashboard:

| Product | Price (€/mo) | Env var |
|---------|--------------|---------|
| TaapR Le Plat | 29 | `STRIPE_PRICE_PLAT_MONTHLY` |
| TaapR Le Menu | 79 | `STRIPE_PRICE_MENU_MONTHLY` |
| TaapR Carte Blanche | 149 | `STRIPE_PRICE_CARTE_MONTHLY` |
| TaapR Module Livraison | 19 | `STRIPE_PRICE_DELIVERY_MONTHLY` |
| TaapR Module Stock | 12 | `STRIPE_PRICE_STOCK_MONTHLY` |

Annual variants (optional, supported by helpers but not used in current UI):
`STRIPE_PRICE_PLAT_ANNUAL`, `STRIPE_PRICE_MENU_ANNUAL`,
`STRIPE_PRICE_CARTE_ANNUAL`.

## 3. Configure the webhook

The same webhook endpoint (`/api/webhooks/stripe`) handles wallet top-ups,
order payments, and subscription lifecycle. In the Stripe Dashboard ensure
the endpoint is subscribed to **all** these events:

- `checkout.session.completed`
- `checkout.session.expired`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`

`STRIPE_WEBHOOK_SECRET` must match the signing secret shown in Stripe.

## 4. Configure the Customer Portal

Stripe Dashboard → Settings → Billing → Customer portal:

- Allow customers to **update payment method**, **view billing history**,
  **cancel subscription**, and **switch plans** between the three tier
  Products.
- Add the delivery and stock Prices to the list of "subscription products
  customers can switch to" so they can toggle add-ons themselves.

## 5. Trial

The codebase grants a 14-day trial (`TRIAL_DAYS` in `src/lib/subscription.ts`)
on every new subscription via `subscription_data.trial_period_days`. Stripe
Checkout collects the card up front but does not charge until the trial ends.

## 6. End-to-end flow

1. New owner finishes onboarding → step 7 picks tier + addons.
2. Onboarding submits → user + restaurant created → user signed in → POST
   `/api/admin/subscription/create-checkout-session` → redirect to Stripe.
3. Stripe sends `checkout.session.completed` (mode=subscription) →
   `customer.subscription.created` → webhook syncs `subscription_tier`,
   status, addons, period end onto the restaurant.
4. Owner returns to `/admin/[slug]/settings?tab=account&subscription=success`.
5. Later changes (upgrade, downgrade, cancel) happen in the **Customer
   Portal** (Compte tab → "Gérer l'abonnement"); webhook keeps the DB in sync.

If price IDs are not yet configured, onboarding falls back to the success
modal — owner can pick a plan later from settings.

## 7. Local testing

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
stripe trigger customer.subscription.created
```
