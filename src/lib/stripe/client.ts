import Stripe from "stripe";

export const stripeLive = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  typescript: true,
});

export const stripeTest = process.env.STRIPE_TEST_SECRET_KEY
  ? new Stripe(process.env.STRIPE_TEST_SECRET_KEY, { typescript: true })
  : null;

export const stripe = stripeLive;

/**
 * Stripe statement_descriptor_suffix: max 22 chars, ASCII letters/digits/spaces only.
 * Strips diacritics and disallowed chars so `Café Crème` -> `CAFE CREME`.
 */
export function buildStatementDescriptorSuffix(restaurantName: string): string {
  return restaurantName
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^A-Za-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 22)
    .toUpperCase();
}
