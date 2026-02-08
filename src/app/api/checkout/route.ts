import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe/client";
import type { OrderItem, OrderItemModifier } from "@/lib/types";

interface CheckoutItem {
  product_id: string;
  product_name: string;
  quantity: number;
  modifiers: { modifier_id: string; group_id: string }[];
}

interface CheckoutBody {
  restaurant_slug: string;
  items: CheckoutItem[];
  customer_info: { name: string; phone: string };
  pickup_time: string;
  payment_method: "online" | "on_site";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CheckoutBody;
    const { restaurant_slug, items, customer_info, pickup_time, payment_method } =
      body;

    // Validate input
    if (!restaurant_slug || !items?.length || !customer_info?.name || !pickup_time) {
      return NextResponse.json(
        { error: "Donnees manquantes" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Fetch restaurant
    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("id, is_accepting_orders, stripe_account_id, stripe_onboarding_complete")
      .eq("slug", restaurant_slug)
      .single();

    if (!restaurant) {
      return NextResponse.json(
        { error: "Restaurant introuvable" },
        { status: 404 }
      );
    }

    if (!restaurant.is_accepting_orders) {
      return NextResponse.json(
        { error: "Le restaurant ne prend plus de commandes" },
        { status: 400 }
      );
    }

    if (payment_method === "online" && (!restaurant.stripe_account_id || !restaurant.stripe_onboarding_complete)) {
      return NextResponse.json(
        { error: "Le paiement en ligne n'est pas disponible pour ce restaurant" },
        { status: 400 }
      );
    }

    // Fetch and validate products + modifiers server-side
    const productIds = items.map((i) => i.product_id);
    const { data: products } = await supabase
      .from("products")
      .select("id, name, price, is_available")
      .in("id", productIds);

    if (!products || products.length !== new Set(productIds).size) {
      return NextResponse.json(
        { error: "Produit(s) introuvable(s)" },
        { status: 400 }
      );
    }

    const productMap = new Map(products.map((p) => [p.id, p]));

    // Collect all modifier IDs to fetch
    const allModifierIds = items.flatMap((i) =>
      i.modifiers.map((m) => m.modifier_id)
    );

    let modifierMap = new Map<
      string,
      { id: string; name: string; price_extra: number; group_id: string }
    >();

    if (allModifierIds.length > 0) {
      const { data: modifiers } = await supabase
        .from("modifiers")
        .select("id, name, price_extra, group_id")
        .in("id", allModifierIds);

      if (modifiers) {
        modifierMap = new Map(modifiers.map((m) => [m.id, m]));
      }
    }

    // Fetch modifier groups for names
    const allGroupIds = items.flatMap((i) =>
      i.modifiers.map((m) => m.group_id)
    );
    let groupMap = new Map<string, { id: string; name: string }>();

    if (allGroupIds.length > 0) {
      const { data: groups } = await supabase
        .from("modifier_groups")
        .select("id, name")
        .in("id", [...new Set(allGroupIds)]);

      if (groups) {
        groupMap = new Map(groups.map((g) => [g.id, g]));
      }
    }

    // Compute order items with server-side prices
    const orderItems: OrderItem[] = [];
    let totalPrice = 0;

    for (const item of items) {
      const product = productMap.get(item.product_id);
      if (!product || !product.is_available) {
        return NextResponse.json(
          { error: `${product?.name || "Produit"} n'est plus disponible` },
          { status: 400 }
        );
      }

      const orderModifiers: OrderItemModifier[] = [];
      let modifiersExtra = 0;

      for (const mod of item.modifiers) {
        const modifier = modifierMap.get(mod.modifier_id);
        const group = groupMap.get(mod.group_id);
        if (!modifier) continue;

        orderModifiers.push({
          group_name: group?.name || "",
          modifier_name: modifier.name,
          price_extra: modifier.price_extra,
        });
        modifiersExtra += modifier.price_extra;
      }

      const lineTotal = (product.price + modifiersExtra) * item.quantity;
      totalPrice += lineTotal;

      orderItems.push({
        product_id: product.id,
        product_name: product.name,
        quantity: item.quantity,
        unit_price: product.price,
        modifiers: orderModifiers,
        line_total: lineTotal,
      });
    }

    // Build pickup datetime
    const now = new Date();
    const [h, m] = pickup_time.split(":").map(Number);
    const pickupDate = new Date(now);
    pickupDate.setHours(h, m, 0, 0);

    // Create order in database
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        restaurant_id: restaurant.id,
        customer_info,
        items: orderItems,
        status: "new",
        total_price: totalPrice,
        pickup_time: pickupDate.toISOString(),
        payment_method,
        paid: payment_method === "on_site", // On-site orders are "paid" immediately (collected at pickup)
      })
      .select("id")
      .single();

    if (orderError || !order) {
      console.error("Order creation error:", orderError);
      return NextResponse.json(
        { error: "Erreur lors de la creation de la commande" },
        { status: 500 }
      );
    }

    // If on_site payment, return order ID directly
    if (payment_method === "on_site") {
      return NextResponse.json({ order_id: order.id });
    }

    // If online payment, create Stripe Checkout Session
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      locale: "fr",
      line_items: orderItems.map((item) => ({
        price_data: {
          currency: "eur",
          product_data: {
            name: item.product_name,
            description:
              item.modifiers.map((m) => m.modifier_name).join(", ") ||
              undefined,
          },
          unit_amount: item.unit_price + item.modifiers.reduce((s, m) => s + m.price_extra, 0),
        },
        quantity: item.quantity,
      })),
      payment_intent_data: {
        transfer_data: {
          destination: restaurant.stripe_account_id!,
        },
      },
      metadata: {
        order_id: order.id,
        restaurant_id: restaurant.id,
      },
      success_url: `${appUrl}/${restaurant_slug}/order-confirmation/${order.id}`,
      cancel_url: `${appUrl}/${restaurant_slug}/checkout`,
    });

    // Update order with stripe session id
    await supabase
      .from("orders")
      .update({ stripe_session_id: session.id })
      .eq("id", order.id);

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Checkout error:", err);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
