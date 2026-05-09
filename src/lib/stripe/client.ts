import Stripe from "stripe";

export const stripeLive = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  typescript: true,
});

export const stripeTest = process.env.STRIPE_TEST_SECRET_KEY
  ? new Stripe(process.env.STRIPE_TEST_SECRET_KEY, { typescript: true })
  : null;

export const stripe = stripeLive;
