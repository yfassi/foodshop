import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const VALID_TIERS = new Set(["essentiel", "pro", "business"]);

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const {
      restaurant_slug,
      subscription_tier,
      delivery_addon_active,
      stock_addon_active,
    } = body as {
      restaurant_slug?: string;
      subscription_tier?: string;
      delivery_addon_active?: boolean;
      stock_addon_active?: boolean;
    };

    if (!restaurant_slug) {
      return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
    }

    const serverSupabase = await createClient();
    const {
      data: { user },
    } = await serverSupabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const supabase = createAdminClient();

    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("id, owner_id, subscription_tier, delivery_addon_active, stock_addon_active, delivery_enabled, order_types")
      .eq("slug", restaurant_slug)
      .single();

    if (!restaurant || restaurant.owner_id !== user.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const update: Record<string, unknown> = {};

    let nextTier = restaurant.subscription_tier as string;
    if (subscription_tier !== undefined) {
      if (!VALID_TIERS.has(subscription_tier)) {
        return NextResponse.json(
          { error: "Plan invalide" },
          { status: 400 }
        );
      }
      nextTier = subscription_tier;
      update.subscription_tier = subscription_tier;
    }

    let nextDeliveryActive = !!restaurant.delivery_addon_active;
    if (delivery_addon_active !== undefined) {
      // Delivery only available on Pro/Business
      if (delivery_addon_active && nextTier !== "pro" && nextTier !== "business") {
        return NextResponse.json(
          {
            error:
              "Le module Livraison nécessite un plan Pro ou Business",
          },
          { status: 400 }
        );
      }
      nextDeliveryActive = delivery_addon_active;
      update.delivery_addon_active = delivery_addon_active;
    }

    // If we're downgrading the plan and delivery is no longer compatible, drop the addon
    if (
      subscription_tier !== undefined &&
      nextTier !== "pro" &&
      nextTier !== "business" &&
      restaurant.delivery_addon_active
    ) {
      update.delivery_addon_active = false;
      update.delivery_enabled = false;
      const current: string[] = Array.isArray(restaurant.order_types)
        ? (restaurant.order_types as string[])
        : [];
      update.order_types = current.filter((t) => t !== "delivery");
      nextDeliveryActive = false;
    }

    if (stock_addon_active !== undefined) {
      update.stock_addon_active = stock_addon_active;
    }

    // Disabling delivery addon also turns the feature off
    if (delivery_addon_active === false || nextDeliveryActive === false) {
      if (restaurant.delivery_enabled) {
        update.delivery_enabled = false;
        const current: string[] = Array.isArray(restaurant.order_types)
          ? (restaurant.order_types as string[])
          : [];
        update.order_types = current.filter((t) => t !== "delivery");
      }
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ success: true });
    }

    const { error } = await supabase
      .from("restaurants")
      .update(update)
      .eq("id", restaurant.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("subscription update error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
