import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe/client";

interface PortalBody {
  restaurant_public_id: string;
}

/**
 * Creates a Stripe Customer Portal session so the restaurant owner can
 * manage their TaapR subscription (payment method, plan, invoices).
 *
 * If no `stripe_customer_id` is recorded yet — e.g. the subscription
 * was set up manually by the TaapR team or the owner is on a comped
 * plan — we return a 409 with an explicit reason so the UI can show a
 * "contact support" path instead of failing silently.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PortalBody;
    const { restaurant_public_id } = body;

    const supabaseAuth = await createClient();
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("id, slug, stripe_customer_id")
      .eq("public_id", restaurant_public_id)
      .eq("owner_id", user.id)
      .single();

    if (!restaurant) {
      return NextResponse.json(
        { error: "Restaurant introuvable" },
        { status: 404 },
      );
    }

    if (!restaurant.stripe_customer_id) {
      return NextResponse.json(
        {
          error: "billing_not_configured",
          message:
            "Votre facturation n'est pas encore connectée à Stripe. Contactez le support pour activer la gestion en self-service.",
        },
        { status: 409 },
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const session = await stripe.billingPortal.sessions.create({
      customer: restaurant.stripe_customer_id,
      return_url: `${appUrl}/admin/${restaurant_public_id}/reglages/compte`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Stripe billing portal error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
