import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe/client";
import { isCurrentlyOpen } from "@/lib/constants";
import type { OrderItem, OrderItemModifier } from "@/lib/types";

interface CheckoutItem {
  product_id: string;
  product_name: string;
  quantity: number;
  is_menu?: boolean;
  modifiers: { modifier_id: string; group_id: string }[];
}

interface CheckoutBody {
  restaurant_slug: string;
  items: CheckoutItem[];
  order_type?: "dine_in" | "takeaway";
  payment_method: "online" | "on_site";
  payment_source?: "direct" | "wallet";
  customer_name?: string;
  order_notes?: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CheckoutBody;
    const {
      restaurant_slug,
      items,
      order_type,
      payment_method,
      payment_source = "direct",
      customer_name,
      order_notes,
    } = body;

    // Validate input
    if (!restaurant_slug || !items?.length) {
      return NextResponse.json(
        { error: "Donnees manquantes" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Fetch restaurant
    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("id, is_accepting_orders, opening_hours, stripe_account_id, stripe_onboarding_complete, order_types")
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

    if (!isCurrentlyOpen(restaurant.opening_hours as Record<string, unknown> | null)) {
      return NextResponse.json(
        { error: "Le restaurant est actuellement fermé" },
        { status: 400 }
      );
    }

    if (payment_method === "online" && payment_source === "direct" && (!restaurant.stripe_account_id || !restaurant.stripe_onboarding_complete)) {
      return NextResponse.json(
        { error: "Le paiement en ligne n'est pas disponible pour ce restaurant" },
        { status: 400 }
      );
    }

    // Validate order type
    const restaurantOrderTypes: string[] = (restaurant.order_types as string[]) || ["dine_in", "takeaway"];
    const resolvedOrderType = order_type && restaurantOrderTypes.includes(order_type) ? order_type : restaurantOrderTypes[0];

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
      .select("id, name, price, is_available, menu_supplement")
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

      // Also check shared_modifiers for IDs not found in per-product modifiers
      const missingModIds = allModifierIds.filter((id) => !modifierMap.has(id));
      if (missingModIds.length > 0) {
        const { data: sharedMods } = await supabase
          .from("shared_modifiers")
          .select("id, name, price_extra, group_id")
          .in("id", missingModIds);

        if (sharedMods) {
          for (const m of sharedMods) {
            modifierMap.set(m.id, m);
          }
        }
      }
    }

    // Fetch modifier groups for names
    const allGroupIds = items.flatMap((i) =>
      i.modifiers.map((m) => m.group_id)
    );
    let groupMap = new Map<string, { id: string; name: string }>();

    if (allGroupIds.length > 0) {
      const uniqueGroupIds = [...new Set(allGroupIds)];

      const { data: groups } = await supabase
        .from("modifier_groups")
        .select("id, name")
        .in("id", uniqueGroupIds);

      if (groups) {
        groupMap = new Map(groups.map((g) => [g.id, g]));
      }

      // Also check shared_modifier_groups for IDs not found
      const missingGroupIds = uniqueGroupIds.filter((id) => !groupMap.has(id));
      if (missingGroupIds.length > 0) {
        const { data: sharedGroups } = await supabase
          .from("shared_modifier_groups")
          .select("id, name")
          .in("id", missingGroupIds);

        if (sharedGroups) {
          for (const g of sharedGroups) {
            groupMap.set(g.id, g);
          }
        }
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

      // Validate menu option
      let menuSupplement = 0;
      if (item.is_menu) {
        if (product.menu_supplement == null) {
          return NextResponse.json(
            { error: `${product.name} ne propose pas l'option menu` },
            { status: 400 }
          );
        }
        menuSupplement = product.menu_supplement;
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

      const lineTotal = (product.price + menuSupplement + modifiersExtra) * item.quantity;
      totalPrice += lineTotal;

      orderItems.push({
        product_id: product.id,
        product_name: product.name,
        quantity: item.quantity,
        unit_price: product.price + menuSupplement,
        modifiers: orderModifiers,
        line_total: lineTotal,
        ...(item.is_menu && { is_menu: true, menu_supplement: menuSupplement }),
      });
    }

    // Build customer info
    const customerInfo: Record<string, string> = {};
    if (customer_name) customerInfo.name = customer_name;
    if (order_notes) customerInfo.notes = order_notes;

    // Generate display order number
    const orderPrefix = payment_method === "on_site" ? "CPT" : "CB";
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
          customer_info: customerInfo,
          items: orderItems,
          status: "new",
          total_price: totalPrice,
          payment_method,
          order_type: resolvedOrderType,
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
        customer_info: customerInfo,
        items: orderItems,
        status: "new",
        total_price: totalPrice,
        payment_method,
        order_type: resolvedOrderType,
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
            name: item.is_menu ? `${item.product_name} (Menu)` : item.product_name,
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
