"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useCartStore } from "@/stores/cart-store";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { createClient } from "@/lib/supabase/client";
import type { AcceptedPaymentMethod, CustomerProfile } from "@/lib/types";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function CheckoutPage() {
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const items = useCartStore((s) => s.items);
  const [stripeConnected, setStripeConnected] = useState(false);
  const [acceptedMethods, setAcceptedMethods] = useState<AcceptedPaymentMethod[]>(["on_site"]);
  const [customerProfile, setCustomerProfile] = useState<CustomerProfile | null>(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (items.length === 0) {
      router.replace(`/${slug}`);
      return;
    }

    const fetchData = async () => {
      const supabase = createClient();

      // Fetch restaurant config
      const { data: restaurant } = await supabase
        .from("restaurants")
        .select("id, is_accepting_orders, stripe_onboarding_complete, accepted_payment_methods")
        .eq("slug", slug)
        .single();

      if (restaurant && !restaurant.is_accepting_orders) {
        router.replace(`/${slug}`);
        return;
      }

      if (restaurant) {
        setStripeConnected(restaurant.stripe_onboarding_complete === true);
        const methods = (restaurant.accepted_payment_methods as string[]) || ["on_site"];
        setAcceptedMethods(methods as AcceptedPaymentMethod[]);

        // Fetch customer profile if logged in
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from("customer_profiles")
            .select("*")
            .eq("user_id", user.id)
            .single();

          if (profile) {
            setCustomerProfile(profile as CustomerProfile);
          }

          // Fetch wallet balance
          const { data: wallet } = await supabase
            .from("wallets")
            .select("balance")
            .eq("user_id", user.id)
            .eq("restaurant_id", restaurant.id)
            .single();

          if (wallet) {
            setWalletBalance(wallet.balance);
          }
        }
      }

      setLoading(false);
    };

    fetchData();
  }, [items.length, slug, router]);

  if (loading || items.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="px-4 py-4 md:px-6">
      <Link
        href={`/${slug}`}
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour au menu
      </Link>

      <h2 className="mb-4 text-lg font-bold">Finaliser la commande</h2>

      <div className="mx-auto max-w-lg">
        <CheckoutForm
          slug={slug}
          stripeConnected={stripeConnected}
          acceptedPaymentMethods={acceptedMethods}
          customerProfile={customerProfile}
          walletBalance={walletBalance}
        />
      </div>
    </div>
  );
}
