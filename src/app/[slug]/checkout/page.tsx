"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useCartStore } from "@/stores/cart-store";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function CheckoutPage() {
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const items = useCartStore((s) => s.items);
  const [hours, setHours] = useState<{ open: string; close: string } | null>(
    null
  );
  const [stripeConnected, setStripeConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (items.length === 0) {
      router.replace(`/${slug}`);
      return;
    }

    const fetchHours = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("restaurants")
        .select("opening_hours, is_accepting_orders, stripe_onboarding_complete")
        .eq("slug", slug)
        .single();

      if (data && !data.is_accepting_orders) {
        router.replace(`/${slug}`);
        return;
      }

      if (data?.opening_hours) {
        const days = [
          "sunday",
          "monday",
          "tuesday",
          "wednesday",
          "thursday",
          "friday",
          "saturday",
        ];
        const today = days[new Date().getDay()];
        const todayHours = data.opening_hours[today] as {
          open: string;
          close: string;
        } | undefined;
        setHours(todayHours || { open: "11:00", close: "22:00" });
      }
      setStripeConnected(data?.stripe_onboarding_complete === true);
      setLoading(false);
    };

    fetchHours();
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

      <h2 className="mb-4 text-lg font-bold">
        Finaliser la commande
      </h2>

      <div className="mx-auto max-w-lg">
        {hours && (
          <CheckoutForm
            slug={slug}
            openTime={hours.open}
            closeTime={hours.close}
            stripeConnected={stripeConnected}
          />
        )}
      </div>
    </div>
  );
}
