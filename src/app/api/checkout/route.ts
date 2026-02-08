import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
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
  customer_info: { name: string; phone?: string };
  payment_method: "online" | "on_site";
  payment_source?: "direct" | "wallet";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CheckoutBody;
    const {
      restaurant_slug,
      items,
      customer_info,
      payment_method,
      payment_source = "direct",
    } = body;

    // Validate input
    if (!restaurant_slug || !items?.length || !customer_info?.name) {
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

    if (payment_method === "online" && payment_source === "direct" && (!restaurant.stripe_account_id || !restaurant.stripe_onboarding_complete)) {
      return NextResponse.json(
        { error: "Le paiement en ligne n'est pas disponible pour ce restaurant" },
        { status: 400 }
      );
    }

    // Get authenticated user if any
    let customerUserId: string | null = null;
    if (payment_source === "wallet") {
      const serverSupabase = await createClient();
      const { data: { user } } = await serverSupabase.auth.getUser();
      if (!user) {
        return NextResponse.json(
          { error: "Vous devez etre connecte pour payer avec le solde" },
          { status: 401 }
        );
      }
      customerUserId = user.id;
    } else {
      // Check if user is logged in (optional for direct payments)
      try {
        const serverSupabase = await createClient();
        const { data: { user } } = await serverSupabase.auth.getUser();
        if (user) customerUserId = user.id;
      } catch {
        // Not logged in, that's fine
      }
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

    // Generate display order number
    const orderPrefix = payment_method === "on_site" ? "ESP" : "CB";
    const { data: orderNumberResult } = await supabase.rpc(
      "next_daily_order_number",
      { p_restaurant_id: restaurant.id, p_prefix: orderPrefix }
    );
    const displayOrderNumber = orderNumberResult || `${orderPrefix}-000`;

    // Handle wallet payment
    if (payment_source === "wallet" && customerUserId) {
      // Get wallet
      const { data: wallet } = await supabase
        .from("wallets")
        .select("id, balance")
        .eq("user_id", customerUserId)
        .eq("restaurant_id", restaurant.id)
        .single();

      if (!wallet || wallet.balance < totalPrice) {
        return NextResponse.json(
          { error: "Solde insuffisant" },
          { status: 400 }
        );
      }

      // Create order first
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          restaurant_id: restaurant.id,
          customer_info,
          items: orderItems,
          status: "new",
          total_price: totalPrice,
          payment_method,
          payment_source: "wallet",
          customer_user_id: customerUserId,
          display_order_number: displayOrderNumber,
          paid: true,
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

      // Deduct wallet balance atomically
      const { error: deductError } = await supabase.rpc(
        "deduct_wallet_balance",
        { p_wallet_id: wallet.id, p_amount: totalPrice, p_order_id: order.id }
      );

      if (deductError) {
        // Rollback: cancel the order
        await supabase
          .from("orders")
          .update({ status: "cancelled" })
          .eq("id", order.id);
        return NextResponse.json(
          { error: "Solde insuffisant" },
          { status: 400 }
        );
      }

      return NextResponse.json({ order_id: order.id });
    }

    // Create order in database (direct payment)
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        restaurant_id: restaurant.id,
        customer_info,
        items: orderItems,
        status: "new",
        total_price: totalPrice,
        payment_method,
        payment_source: "direct",
        display_order_number: displayOrderNumber,
        ...(customerUserId && { customer_user_id: customerUserId }),
        paid: payment_method === "on_site",
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
        type: "order",
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
