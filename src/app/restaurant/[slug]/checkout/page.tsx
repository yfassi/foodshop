"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useCartStore } from "@/stores/cart-store";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { createClient } from "@/lib/supabase/client";
import { isCurrentlyOpen } from "@/lib/constants";
import type { AcceptedPaymentMethod, CustomerProfile, DeliveryConfig, OrderType, CategoryWithProducts, Category, Product, Modifier } from "@/lib/types";
import { CartSuggestions } from "@/components/cart/cart-suggestions";
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
  const [orderTypes, setOrderTypes] = useState<OrderType[]>(["dine_in", "takeaway"]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [loyaltyEnabled, setLoyaltyEnabled] = useState(false);
  const [restaurantCoords, setRestaurantCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [categories, setCategories] = useState<CategoryWithProducts[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (items.length === 0) {
      router.replace(`/restaurant/${slug}/order`);
      return;
    }

    const fetchData = async () => {
      const supabase = createClient();

      // Fetch restaurant config
      const { data: restaurant } = await supabase
        .from("restaurants")
        .select("*")
        .eq("slug", slug)
        .single();

      if (restaurant && (!restaurant.is_accepting_orders || !isCurrentlyOpen(restaurant.opening_hours as Record<string, unknown> | null))) {
        router.replace(`/restaurant/${slug}/order`);
        return;
      }

      if (restaurant) {
        setStripeConnected(restaurant.stripe_onboarding_complete === true);
        const methods = (restaurant.accepted_payment_methods as string[]) || ["on_site"];
        setAcceptedMethods(methods as AcceptedPaymentMethod[]);
        const types = (restaurant.order_types as string[]) || ["dine_in", "takeaway"];
        const filteredTypes =
          restaurant.delivery_addon_active && restaurant.delivery_enabled
            ? types
            : types.filter((t) => t !== "delivery");
        setOrderTypes(filteredTypes as OrderType[]);
        setLoyaltyEnabled(restaurant.loyalty_enabled === true);
        const deliveryConfig = (restaurant.delivery_config || {}) as DeliveryConfig;
        if (deliveryConfig.coords) {
          setRestaurantCoords({
            lat: deliveryConfig.coords.lat,
            lng: deliveryConfig.coords.lng,
          });
        }

        // Fetch categories for suggestions
        const { data: cats } = await supabase
          .from("categories")
          .select("*")
          .eq("restaurant_id", restaurant.id)
          .eq("is_visible", true)
          .order("sort_order")
          .returns<Category[]>();

        if (cats && cats.length > 0) {
          const { data: prods } = await supabase
            .from("products")
            .select("*")
            .in("category_id", cats.map((c) => c.id))
            .eq("is_available", true)
            .order("sort_order")
            .returns<Product[]>();

          if (prods) {
            const catWithProducts: CategoryWithProducts[] = cats
              .map((cat) => ({
                ...cat,
                products: (prods.filter((p) => p.category_id === cat.id) || []).map((p) => ({
                  ...p,
                  modifier_groups: [] as { id: string; name: string; product_id: string; min_select: number; max_select: number; sort_order: number; created_at: string; modifiers: Modifier[] }[],
                })),
              }))
              .filter((cat) => cat.products.length > 0);
            setCategories(catWithProducts);
          }
        }

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
      <div className="mx-auto max-w-lg">
        <Link
          href={`/restaurant/${slug}/order`}
          className="mb-4 inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-background px-3 text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Retour au menu
        </Link>

        <div className="mb-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            Étape finale
          </p>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight">Paiement</h2>
        </div>

        {/* Last-chance suggestions */}
        {categories.length > 0 && (
          <div className="mb-4">
            <CartSuggestions categories={categories} label="Un petit extra ?" />
          </div>
        )}

        <CheckoutForm
          slug={slug}
          stripeConnected={stripeConnected}
          acceptedPaymentMethods={acceptedMethods}
          orderTypes={orderTypes}
          customerProfile={customerProfile}
          walletBalance={walletBalance}
          loyaltyEnabled={loyaltyEnabled}
          restaurantCoords={restaurantCoords}
        />
      </div>
    </div>
  );
}
