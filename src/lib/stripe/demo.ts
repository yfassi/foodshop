import type Stripe from "stripe";
import { stripeLive, stripeTest } from "./client";
import { createAdminClient } from "@/lib/supabase/admin";

export const MISSING_TEST_KEYS_ERROR =
  "Mode démo activé pour ce compte mais STRIPE_TEST_SECRET_KEY n'est pas configuré sur le serveur.";

export function getStripeForDemo(isDemo: boolean): Stripe {
  if (isDemo) {
    if (!stripeTest) throw new Error(MISSING_TEST_KEYS_ERROR);
    return stripeTest;
  }
  return stripeLive;
}

export async function isDemoCustomerEmail(
  email: string | null | undefined
): Promise<boolean> {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("platform_demo_customers")
    .select("email")
    .eq("email", normalized)
    .maybeSingle();

  return !!data;
}
