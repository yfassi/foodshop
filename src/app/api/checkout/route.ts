import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { stripeLive, stripeTest, buildStatementDescriptorSuffix } from "@/lib/stripe/client";
import { isDemoCustomerEmail, MISSING_TEST_KEYS_ERROR } from "@/lib/stripe/demo";
import { isCurrentlyOpen } from "@/lib/constants";
import { sendPushNotification } from "@/lib/push";
import { sendOrderConfirmationEmail } from "@/lib/email/send-order-confirmation";
import { enqueueOrderPrintJobs } from "@/lib/print/enqueue";
import { formatPrice } from "@/lib/format";
import { matchZone } from "@/lib/delivery";
import type {
  DeliveryAddress,
  DeliveryConfig,
  OrderItem,
  OrderItemModifier,
} from "@/lib/types";

interface CheckoutItem {
  product_id: string;
  product_name: string;
  quantity: number;
  is_menu?: boolean;
  modifiers: { modifier_id: string; group_id: string }[];
}

interface CheckoutBody {
  restaurant_public_id: string;
  items: CheckoutItem[];
  order_type?: "dine_in" | "takeaway" | "delivery";
  payment_method: "online" | "on_site";
  payment_source?: "direct" | "wallet";
  customer_name?: string;
  customer_email?: string;
  order_notes?: string;
  queue_session_id?: string;
  delivery_address?: DeliveryAddress;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function notifyAdmins(
  restaurantId: string,
  restaurantPublicId: string,
  displayOrderNumber: string,
  totalPrice: number
) {
  try {
    const supabase = createAdminClient();
    const { data: subscriptions } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("restaurant_id", restaurantId)
      .eq("role", "admin");

    if (!subscriptions?.length) return;

    const expiredIds: string[] = [];
    await Promise.all(
      subscriptions.map(async (sub) => {
        const result = await sendPushNotification(
          { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
          {
            title: "Nouvelle commande",
            body: `Commande ${displayOrderNumber} — ${formatPrice(totalPrice)}`,
            url: `/admin/${restaurantPublicId}`,
            tag: "new-order",
          }
        );
        if (result.expired) expiredIds.push(sub.id);
      })
    );

    if (expiredIds.length > 0) {
      await supabase.from("push_subscriptions").delete().in("id", expiredIds);
    }
  } catch (err) {
    console.error("Admin push error:", err);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CheckoutBody;
    const {
      restaurant_public_id,
      items,
      order_type,
      payment_method,
      payment_source = "direct",
      customer_name,
      customer_email,
      order_notes,
      queue_session_id,
      delivery_address,
    } = body;

    const sanitizedEmail =
      customer_email && EMAIL_RE.test(customer_email.trim())
        ? customer_email.trim().toLowerCase().slice(0, 254)
        : null;

    // Validate input
    if (!restaurant_public_id || !items?.length) {
      return NextResponse.json(
        { error: "Donnees manquantes" },
        { status: 400 }
      );
    }

    // Validate string lengths to prevent abuse
    if (customer_name && customer_name.length > 100) {
      return NextResponse.json(
        { error: "Nom trop long (100 caractères max)" },
        { status: 400 }
      );
    }

    if (order_notes && order_notes.length > 500) {
      return NextResponse.json(
        { error: "Notes trop longues (500 caractères max)" },
        { status: 400 }
      );
    }

    if (customer_email) {
      const trimmed = customer_email.trim();
      if (trimmed.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        return NextResponse.json(
          { error: "Email invalide" },
          { status: 400 }
        );
      }
    }

    const supabase = createAdminClient();

    // Resolve authenticated user early so we know if it's a demo customer
    // (impacts which Stripe instance + transfer_data and the is_demo flag)
    let customerUserId: string | null = null;
    let customerEmail: string | null = null;
    try {
      const serverSupabase = await createClient();
      const { data: { user } } = await serverSupabase.auth.getUser();
      if (user) {
        customerUserId = user.id;
        customerEmail = user.email ?? null;
      }
    } catch {
      // Not logged in
    }

    if (payment_source === "wallet" && !customerUserId) {
      return NextResponse.json(
        { error: "Vous devez etre connecte pour payer avec le solde" },
        { status: 401 }
      );
    }

    const isDemo = await isDemoCustomerEmail(customerEmail);
    if (isDemo && !stripeTest) {
      return NextResponse.json({ error: MISSING_TEST_KEYS_ERROR }, { status: 500 });
    }
    const stripeClient = isDemo ? stripeTest! : stripeLive;

    // Fetch restaurant
    const { data: restaurant } = await supabase
      .from("restaurants")
      .select(
        "id, name, is_accepting_orders, opening_hours, stripe_account_id, stripe_onboarding_complete, order_types, queue_enabled, delivery_addon_active, delivery_enabled, delivery_config"
      )
      .eq("public_id", restaurant_public_id)
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

    // Queue validation: if queue is enabled, require an active ticket
    if (restaurant.queue_enabled && !queue_session_id) {
      return NextResponse.json(
        { error: "Veuillez attendre votre tour dans la file d'attente" },
        { status: 400 }
      );
    }

    if (restaurant.queue_enabled && queue_session_id) {
      const { data: activeTicket } = await supabase
        .from("queue_tickets")
        .select("id, status, expires_at")
        .eq("restaurant_id", restaurant.id)
        .eq("customer_session_id", queue_session_id)
        .eq("status", "active")
        .limit(1)
        .single();

      if (!activeTicket) {
        return NextResponse.json(
          { error: "Veuillez attendre votre tour dans la file d'attente" },
          { status: 400 }
        );
      }

      // Check expiry
      if (activeTicket.expires_at && new Date(activeTicket.expires_at) < new Date()) {
        await supabase
          .from("queue_tickets")
          .update({ status: "expired", updated_at: new Date().toISOString() })
          .eq("id", activeTicket.id);

        return NextResponse.json(
          { error: "Votre ticket a expiré. Veuillez reprendre la file d'attente." },
          { status: 400 }
        );
      }

      // Mark ticket as completed after successful order placement (done later)
    }

    if (
      payment_method === "online" &&
      payment_source === "direct" &&
      !isDemo &&
      (!restaurant.stripe_account_id || !restaurant.stripe_onboarding_complete)
    ) {
      return NextResponse.json(
        { error: "Le paiement en ligne n'est pas disponible pour ce restaurant" },
        { status: 400 }
      );
    }

    // Validate order type
    const restaurantOrderTypes: string[] = (restaurant.order_types as string[]) || ["dine_in", "takeaway"];
    const resolvedOrderType = order_type && restaurantOrderTypes.includes(order_type) ? order_type : restaurantOrderTypes[0];

    // Delivery: validate address + recompute fee server-side
    let deliveryFee = 0;
    let deliveryZoneId: string | null = null;
    let deliveryDistanceM: number | null = null;
    let sanitizedDeliveryAddress: DeliveryAddress | null = null;

    if (resolvedOrderType === "delivery") {
      if (!restaurant.delivery_addon_active || !restaurant.delivery_enabled) {
        return NextResponse.json(
          { error: "Livraison non activée" },
          { status: 400 }
        );
      }
      if (
        !delivery_address ||
        typeof delivery_address.lat !== "number" ||
        typeof delivery_address.lng !== "number"
      ) {
        return NextResponse.json(
          { error: "Adresse de livraison manquante" },
          { status: 400 }
        );
      }
      const config = (restaurant.delivery_config || {}) as DeliveryConfig;
      const match = matchZone(config, {
        lat: delivery_address.lat,
        lng: delivery_address.lng,
      });
      if (!match) {
        return NextResponse.json(
          { error: "Adresse hors zone de livraison" },
          { status: 400 }
        );
      }
      deliveryFee = match.zone.fee;
      deliveryZoneId = match.zone.id;
      deliveryDistanceM = match.distance_m;
      sanitizedDeliveryAddress = {
        lat: delivery_address.lat,
        lng: delivery_address.lng,
        formatted: String(delivery_address.formatted || ""),
        street: delivery_address.street ? String(delivery_address.street) : undefined,
        city: delivery_address.city ? String(delivery_address.city) : undefined,
        postal_code: delivery_address.postal_code
          ? String(delivery_address.postal_code)
          : undefined,
        floor_notes: delivery_address.floor_notes
          ? String(delivery_address.floor_notes).slice(0, 300)
          : undefined,
      };
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

    if (deliveryFee > 0) {
      totalPrice += deliveryFee;
    }

    // Build customer info
    const customerInfo: Record<string, string> = {};
    if (customer_name) customerInfo.name = customer_name;
    const recipientEmail = sanitizedEmail || customerEmail;
    if (recipientEmail) customerInfo.email = recipientEmail;
    if (order_notes) customerInfo.notes = order_notes;

    // Generate display order number
    const orderPrefix = payment_method === "on_site" ? "CPT" : "CB";
    const { data: orderNumberResult, error: orderNumberError } = await supabase.rpc(
      "next_daily_order_number",
      { p_restaurant_id: restaurant.id, p_prefix: orderPrefix }
    );
    if (orderNumberError || !orderNumberResult) {
      console.error("[checkout] order numbering failed:", orderNumberError);
      return NextResponse.json(
        { error: "Erreur de numérotation des commandes" },
        { status: 500 }
      );
    }
    const displayOrderNumber = orderNumberResult;

    // Handle wallet payment (full or partial)
    if (payment_source === "wallet" && customerUserId) {
      // Get wallet
      const { data: wallet } = await supabase
        .from("wallets")
        .select("id, balance")
        .eq("user_id", customerUserId)
        .eq("restaurant_id", restaurant.id)
        .single();

      if (!wallet || wallet.balance <= 0) {
        return NextResponse.json(
          { error: "Solde insuffisant" },
          { status: 400 }
        );
      }

      const walletAmount = Math.min(wallet.balance, totalPrice);
      const remainder = totalPrice - walletAmount;
      const isFullWallet = remainder === 0;

      // Create order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          restaurant_id: restaurant.id,
          customer_info: customerInfo,
          items: orderItems,
          status: "new",
          total_price: totalPrice,
          payment_method: isFullWallet ? payment_method : "online",
          order_type: resolvedOrderType,
          payment_source: "wallet",
          customer_user_id: customerUserId,
          display_order_number: displayOrderNumber,
          paid: isFullWallet,
          wallet_amount_used: walletAmount,
          is_demo: isDemo,
          ...(resolvedOrderType === "delivery" && {
            delivery_status: "pending",
            delivery_address: sanitizedDeliveryAddress,
            delivery_fee: deliveryFee,
            delivery_zone_id: deliveryZoneId,
            delivery_distance_m: deliveryDistanceM,
          }),
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
        { p_wallet_id: wallet.id, p_amount: walletAmount, p_order_id: order.id }
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

      // Full wallet payment -> done
      if (isFullWallet) {
        // Complete queue ticket
        if (restaurant.queue_enabled && queue_session_id) {
          await supabase
            .from("queue_tickets")
            .update({ status: "completed", updated_at: new Date().toISOString() })
            .eq("restaurant_id", restaurant.id)
            .eq("customer_session_id", queue_session_id)
            .eq("status", "active");
        }
        notifyAdmins(restaurant.id, restaurant_public_id, displayOrderNumber, totalPrice);
        // Fire-and-forget customer confirmation email (idempotent)
        void sendOrderConfirmationEmail({ orderId: order.id });
        // Fire-and-forget print jobs (idempotent)
        void enqueueOrderPrintJobs(order.id);
        return NextResponse.json({ order_id: order.id });
      }

      // Partial wallet -> Stripe for the remainder
      if (!isDemo && (!restaurant.stripe_account_id || !restaurant.stripe_onboarding_complete)) {
        // Rollback if Stripe not available
        await supabase
          .from("orders")
          .update({ status: "cancelled" })
          .eq("id", order.id);
        return NextResponse.json(
          { error: "Le paiement en ligne n'est pas disponible pour ce restaurant" },
          { status: 400 }
        );
      }

      const appUrl =
        process.env.NEXT_PUBLIC_APP_URL ||
        request.headers.get("origin") ||
        new URL(request.url).origin;

      const restaurantName = restaurant.name as string;
      const statementSuffix = buildStatementDescriptorSuffix(restaurantName);

      const session = await stripeClient.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        locale: "fr",
        ...(recipientEmail && { customer_email: recipientEmail }),
        line_items: [
          {
            price_data: {
              currency: "eur",
              product_data: {
                name: `Commande ${displayOrderNumber} chez ${restaurantName} (complément)`,
                description: `Commande chez ${restaurantName} · Total ${(totalPrice / 100).toFixed(2)} € — Solde déduit ${(walletAmount / 100).toFixed(2)} €`,
              },
              unit_amount: remainder,
            },
            quantity: 1,
          },
        ],
        ...(isDemo
          ? {}
          : {
              payment_intent_data: {
                description: `Commande chez ${restaurantName} · ${displayOrderNumber} (complément solde)`,
                transfer_data: {
                  destination: restaurant.stripe_account_id!,
                },
                ...(recipientEmail && { receipt_email: recipientEmail }),
                ...(statementSuffix && { statement_descriptor_suffix: statementSuffix }),
              },
            }),
        metadata: {
          order_id: order.id,
          restaurant_id: restaurant.id,
          type: "order",
          ...(isDemo && { is_demo: "true" }),
          ...(queue_session_id && { queue_session_id }),
        },
        success_url: `${appUrl}/restaurant/${restaurant_public_id}/order-confirmation/${order.id}`,
        cancel_url: `${appUrl}/restaurant/${restaurant_public_id}/checkout`,
      });

      await supabase
        .from("orders")
        .update({ stripe_session_id: session.id })
        .eq("id", order.id);

      return NextResponse.json({ url: session.url });
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
        paid: false,
        is_demo: isDemo,
        ...(resolvedOrderType === "delivery" && {
          delivery_status: "pending",
          delivery_address: sanitizedDeliveryAddress,
          delivery_fee: deliveryFee,
          delivery_zone_id: deliveryZoneId,
          delivery_distance_m: deliveryDistanceM,
        }),
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
      // Complete queue ticket
      if (restaurant.queue_enabled && queue_session_id) {
        await supabase
          .from("queue_tickets")
          .update({ status: "completed", updated_at: new Date().toISOString() })
          .eq("restaurant_id", restaurant.id)
          .eq("customer_session_id", queue_session_id)
          .eq("status", "active");
      }
      notifyAdmins(restaurant.id, restaurant_public_id, displayOrderNumber, totalPrice);
      // Fire-and-forget customer confirmation email for on-site orders
      void sendOrderConfirmationEmail({ orderId: order.id });
      return NextResponse.json({ order_id: order.id });
    }

    // If online payment, create Stripe Checkout Session
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      request.headers.get("origin") ||
      new URL(request.url).origin;

    const restaurantName = restaurant.name as string;
    const merchantPrefix = `Commande chez ${restaurantName}`;

    const stripeLineItems = orderItems.map((item) => {
      const modifiersText = item.modifiers
        .map((m) => m.modifier_name)
        .filter(Boolean)
        .join(", ");
      const description = modifiersText
        ? `${merchantPrefix} · ${modifiersText}`
        : merchantPrefix;
      return {
        price_data: {
          currency: "eur",
          product_data: {
            name: item.is_menu ? `${item.product_name} (Menu)` : item.product_name,
            description,
          },
          unit_amount:
            item.unit_price + item.modifiers.reduce((s, m) => s + m.price_extra, 0),
        },
        quantity: item.quantity,
      };
    });

    if (deliveryFee > 0) {
      stripeLineItems.push({
        price_data: {
          currency: "eur",
          product_data: {
            name: "Frais de livraison",
            description: merchantPrefix,
          },
          unit_amount: deliveryFee,
        },
        quantity: 1,
      });
    }

    const statementSuffix = buildStatementDescriptorSuffix(restaurantName);

    const session = await stripeClient.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      locale: "fr",
      ...(recipientEmail && { customer_email: recipientEmail }),
      line_items: stripeLineItems,
      ...(isDemo
        ? {}
        : {
            payment_intent_data: {
              description: `${merchantPrefix} · ${displayOrderNumber}`,
              transfer_data: {
                destination: restaurant.stripe_account_id!,
              },
              ...(recipientEmail && { receipt_email: recipientEmail }),
              ...(statementSuffix && { statement_descriptor_suffix: statementSuffix }),
            },
          }),
      metadata: {
        order_id: order.id,
        restaurant_id: restaurant.id,
        type: "order",
        ...(isDemo && { is_demo: "true" }),
        ...(queue_session_id && { queue_session_id }),
      },
      success_url: `${appUrl}/restaurant/${restaurant_public_id}/order-confirmation/${order.id}`,
      cancel_url: `${appUrl}/restaurant/${restaurant_public_id}/checkout`,
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
