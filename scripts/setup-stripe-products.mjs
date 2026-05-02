#!/usr/bin/env node
/**
 * One-shot setup: creates Stripe Products + recurring monthly Prices for
 * TaapR's platform subscriptions.
 *
 * Tiers (per migration 016): Le Plat 29€ / Le Menu 79€ / Carte Blanche 149€.
 * Add-ons: Livraison 19€/mois, Stock 12€/mois.
 *
 * Usage:
 *   STRIPE_SECRET_KEY=sk_test_… node scripts/setup-stripe-products.mjs
 *
 * Optional flags:
 *   --annual       Also create annual prices (10 months for the price of 12).
 *   --dry-run      Print what would be created/found without mutating Stripe.
 *
 * Idempotent: each Product is identified by metadata.taapr_id. Re-running
 * the script reuses any product with a matching taapr_id and only creates
 * Prices that don't already exist (matched by recurring.interval and
 * unit_amount). Outputs the env var lines to paste into .env.local.
 */

import Stripe from "stripe";

const SECRET = process.env.STRIPE_SECRET_KEY;
if (!SECRET) {
  console.error("STRIPE_SECRET_KEY env var is required.");
  console.error("Get it from Stripe Dashboard → Developers → API keys.");
  process.exit(1);
}

const ARGS = new Set(process.argv.slice(2));
const WITH_ANNUAL = ARGS.has("--annual");
const DRY_RUN = ARGS.has("--dry-run");

const stripe = new Stripe(SECRET, { typescript: false });

const CATALOGUE = [
  {
    taaprId: "tier_plat",
    name: "TaapR Le Plat",
    description: "Plan d'entrée — commandes en ligne, paiement Stripe inclus.",
    monthlyEur: 29,
    annualEur: 290,
    envMonthly: "STRIPE_PRICE_PLAT_MONTHLY",
    envAnnual: "STRIPE_PRICE_PLAT_ANNUAL",
  },
  {
    taaprId: "tier_menu",
    name: "TaapR Le Menu",
    description: "Plan de salle, fidélité, paiement fractionné, export CSV.",
    monthlyEur: 79,
    annualEur: 790,
    envMonthly: "STRIPE_PRICE_MENU_MONTHLY",
    envAnnual: "STRIPE_PRICE_MENU_ANNUAL",
  },
  {
    taaprId: "tier_carte",
    name: "TaapR Carte Blanche",
    description: "Multi-établissements (jusqu'à 5), API, webhooks, support dédié.",
    monthlyEur: 149,
    annualEur: 1490,
    envMonthly: "STRIPE_PRICE_CARTE_MONTHLY",
    envAnnual: "STRIPE_PRICE_CARTE_ANNUAL",
  },
  {
    taaprId: "addon_delivery",
    name: "TaapR Module Livraison",
    description: "Module Livraison — zones, livreurs, suivi temps réel.",
    monthlyEur: 19,
    envMonthly: "STRIPE_PRICE_DELIVERY_MONTHLY",
  },
  {
    taaprId: "addon_stock",
    name: "TaapR Module Stock",
    description: "Gestion de stock — inventaire, scan tickets, alertes seuil.",
    monthlyEur: 12,
    envMonthly: "STRIPE_PRICE_STOCK_MONTHLY",
  },
];

async function findProductByTaaprId(taaprId) {
  for await (const product of stripe.products.list({ limit: 100, active: true })) {
    if (product.metadata?.taapr_id === taaprId) return product;
  }
  return null;
}

async function findPrice(productId, interval, amountCents) {
  for await (const price of stripe.prices.list({
    product: productId,
    active: true,
    limit: 100,
  })) {
    if (
      price.recurring?.interval === interval &&
      price.unit_amount === amountCents &&
      price.currency === "eur"
    ) {
      return price;
    }
  }
  return null;
}

async function ensureProduct(item) {
  const existing = await findProductByTaaprId(item.taaprId);
  if (existing) {
    console.log(`  ✓ product reused: ${existing.id} (${item.name})`);
    return existing;
  }
  if (DRY_RUN) {
    console.log(`  [dry-run] would create product: ${item.name}`);
    return { id: "(dry-run)", metadata: {} };
  }
  const created = await stripe.products.create({
    name: item.name,
    description: item.description,
    metadata: { taapr_id: item.taaprId },
  });
  console.log(`  + product created: ${created.id} (${item.name})`);
  return created;
}

async function ensurePrice(productId, interval, amountEur) {
  const amountCents = Math.round(amountEur * 100);
  if (productId === "(dry-run)") {
    console.log(`  [dry-run] would create price: ${interval} ${amountEur} €`);
    return { id: "(dry-run)" };
  }
  const existing = await findPrice(productId, interval, amountCents);
  if (existing) {
    console.log(
      `    ✓ price reused: ${existing.id} (${interval} ${amountEur} €)`,
    );
    return existing;
  }
  if (DRY_RUN) {
    console.log(`    [dry-run] would create price: ${interval} ${amountEur} €`);
    return { id: "(dry-run)" };
  }
  const created = await stripe.prices.create({
    product: productId,
    currency: "eur",
    unit_amount: amountCents,
    recurring: { interval },
  });
  console.log(
    `    + price created: ${created.id} (${interval} ${amountEur} €)`,
  );
  return created;
}

async function main() {
  const acct = await stripe.accounts.retrieve();
  console.log(
    `Stripe account: ${acct.id} (${acct.business_profile?.name || acct.email || "—"})`,
  );
  console.log(`Mode: ${SECRET.startsWith("sk_live_") ? "LIVE" : "TEST"}`);
  if (DRY_RUN) console.log("[dry-run] no Stripe writes will happen.");
  console.log("");

  const envOut = {};

  for (const item of CATALOGUE) {
    console.log(`▸ ${item.name}`);
    const product = await ensureProduct(item);

    const monthlyPrice = await ensurePrice(product.id, "month", item.monthlyEur);
    envOut[item.envMonthly] = monthlyPrice.id;

    if (WITH_ANNUAL && item.annualEur && item.envAnnual) {
      const annualPrice = await ensurePrice(product.id, "year", item.annualEur);
      envOut[item.envAnnual] = annualPrice.id;
    }
    console.log("");
  }

  console.log("─".repeat(60));
  console.log("Add to .env.local:");
  console.log("─".repeat(60));
  for (const [key, value] of Object.entries(envOut)) {
    console.log(`${key}=${value}`);
  }
}

main().catch((err) => {
  console.error("✗", err.message);
  process.exit(1);
});
