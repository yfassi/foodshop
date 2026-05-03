import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  typescript: true,
});

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
