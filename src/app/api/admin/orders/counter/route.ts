import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCurrentlyOpen } from "@/lib/constants";
import { notifyAdmins } from "@/lib/push-admin";
import type { OrderItem, OrderItemModifier } from "@/lib/types";

interface CounterItem {
  product_id: string;
  product_name: string;
  quantity: number;
  is_menu?: boolean;
  modifiers: { modifier_id: string; group_id: string }[];
}

type PaymentBody =
  | { mode: "on_site"; method: "card" | "cash" | "other" }
  | { mode: "wallet_full" }
  | { mode: "wallet_partial"; on_site_method: "card" | "cash" | "other" };

interface CounterBody {
  restaurant_slug: string;
  items: CounterItem[];
  order_type: "dine_in" | "takeaway";
  customer_user_id?: string;
  customer_label: string;
  pager_number?: string;
  notes?: string;
  payment: PaymentBody;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CounterBody;
    const {
      restaurant_slug,
      items,
      order_type,
      customer_user_id,
      customer_label,
      pager_number,
      notes,
      payment,
    } = body;

    if (!restaurant_slug || !items?.length || !customer_label || !payment) {
      return NextResponse.json({ error: "Donnees manquantes" }, { status: 400 });
    }

    if (customer_label.length > 100) {
      return NextResponse.json(
        { error: "Nom trop long (100 caracteres max)" },
        { status: 400 }
      );
    }

    if (notes && notes.length > 500) {
      return NextResponse.json(
        { error: "Notes trop longues (500 caracteres max)" },
        { status: 400 }
      );
    }

    if (pager_number && pager_number.length > 20) {
      return NextResponse.json(
        { error: "Numero de bipper trop long" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    const adminSupabase = createAdminClient();

    const { data: restaurant } = await adminSupabase
      .from("restaurants")
      .select(
        "id, owner_id, is_accepting_orders, opening_hours, order_types"
      )
      .eq("slug", restaurant_slug)
      .single();

    if (!restaurant || restaurant.owner_id !== user.id) {
      return NextResponse.json({ error: "Non autorise" }, { status: 403 });
    }

    if (!restaurant.is_accepting_orders) {
      return NextResponse.json(
        { error: "Le restaurant ne prend plus de commandes" },
        { status: 400 }
      );
    }

    if (
      !isCurrentlyOpen(
        restaurant.opening_hours as Record<string, unknown> | null
      )
    ) {
      return NextResponse.json(
        { error: "Le restaurant est actuellement ferme" },
        { status: 400 }
      );
    }

    const allowedTypes: string[] =
      (restaurant.order_types as string[]) || ["dine_in", "takeaway"];
    const resolvedOrderType = allowedTypes.includes(order_type)
      ? order_type
      : (allowedTypes[0] as "dine_in" | "takeaway");

    // Validate products + modifiers server-side (mirrors /api/checkout)
    const productIds = items.map((i) => i.product_id);
    const { data: products } = await adminSupabase
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

    const allModifierIds = items.flatMap((i) =>
      i.modifiers.map((m) => m.modifier_id)
    );
    let modifierMap = new Map<
      string,
      { id: string; name: string; price_extra: number; group_id: string }
    >();

    if (allModifierIds.length > 0) {
      const { data: modifiers } = await adminSupabase
        .from("modifiers")
        .select("id, name, price_extra, group_id")
        .in("id", allModifierIds);
      if (modifiers) modifierMap = new Map(modifiers.map((m) => [m.id, m]));

      const missing = allModifierIds.filter((id) => !modifierMap.has(id));
      if (missing.length > 0) {
        const { data: shared } = await adminSupabase
          .from("shared_modifiers")
          .select("id, name, price_extra, group_id")
          .in("id", missing);
        if (shared) for (const m of shared) modifierMap.set(m.id, m);
      }
    }

    const allGroupIds = items.flatMap((i) =>
      i.modifiers.map((m) => m.group_id)
    );
    let groupMap = new Map<string, { id: string; name: string }>();

    if (allGroupIds.length > 0) {
      const unique = [...new Set(allGroupIds)];
      const { data: groups } = await adminSupabase
        .from("modifier_groups")
        .select("id, name")
        .in("id", unique);
      if (groups) groupMap = new Map(groups.map((g) => [g.id, g]));

      const missing = unique.filter((id) => !groupMap.has(id));
      if (missing.length > 0) {
        const { data: shared } = await adminSupabase
          .from("shared_modifier_groups")
          .select("id, name")
          .in("id", missing);
        if (shared) for (const g of shared) groupMap.set(g.id, g);
      }
    }

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

      const lineTotal =
        (product.price + menuSupplement + modifiersExtra) * item.quantity;
      totalPrice += lineTotal;

      orderItems.push({
        product_id: product.id,
        product_name: product.name,
        quantity: item.quantity,
        unit_price: product.price + menuSupplement,
        modifiers: orderModifiers,
        line_total: lineTotal,
        ...(item.is_menu && {
          is_menu: true,
          menu_supplement: menuSupplement,
        }),
      });
    }

    if (totalPrice <= 0) {
      return NextResponse.json({ error: "Total invalide" }, { status: 400 });
    }

    // Build customer info
    const customerInfo: Record<string, string> = {
      name: customer_label,
    };
    if (notes) customerInfo.notes = notes;

    // Display order number — same RPC used by /api/checkout
    const { data: orderNumberResult } = await adminSupabase.rpc(
      "next_daily_order_number",
      { p_restaurant_id: restaurant.id, p_prefix: "CPT" }
    );
    const displayOrderNumber = orderNumberResult || "CPT-000";

    // Resolve wallet info if needed
    let walletId: string | null = null;
    let walletBalance = 0;
    let walletAmountUsed = 0;

    if (
      payment.mode === "wallet_full" ||
      payment.mode === "wallet_partial"
    ) {
      if (!customer_user_id) {
        return NextResponse.json(
          { error: "Client requis pour payer avec la cagnotte" },
          { status: 400 }
        );
      }
      const { data: wallet } = await adminSupabase
        .from("wallets")
        .select("id, balance")
        .eq("user_id", customer_user_id)
        .eq("restaurant_id", restaurant.id)
        .single();

      if (!wallet || wallet.balance <= 0) {
        return NextResponse.json({ error: "Solde insuffisant" }, { status: 400 });
      }

      walletId = wallet.id;
      walletBalance = wallet.balance;

      if (payment.mode === "wallet_full") {
        if (wallet.balance < totalPrice) {
          return NextResponse.json(
            { error: "Solde insuffisant pour couvrir la totalite" },
            { status: 400 }
          );
        }
        walletAmountUsed = totalPrice;
      } else {
        // wallet_partial: use full balance, rest paid on site
        if (wallet.balance >= totalPrice) {
          // No remainder needed — fall back to wallet_full semantics
          walletAmountUsed = totalPrice;
        } else {
          walletAmountUsed = wallet.balance;
        }
      }
    }

    // Insert order — payment is collected on the spot for all counter modes,
    // so it goes straight to kitchen as paid=true.
    const { data: order, error: orderError } = await adminSupabase
      .from("orders")
      .insert({
        restaurant_id: restaurant.id,
        customer_info: customerInfo,
        items: orderItems,
        status: "new",
        total_price: totalPrice,
        payment_method: "on_site",
        order_type: resolvedOrderType,
        payment_source:
          payment.mode === "on_site" ? "direct" : "wallet",
        ...(customer_user_id && { customer_user_id }),
        display_order_number: displayOrderNumber,
        paid: true,
        ...(walletAmountUsed > 0 && { wallet_amount_used: walletAmountUsed }),
        ...(pager_number && { pager_number }),
      })
      .select("id")
      .single();

    if (orderError || !order) {
      console.error("Counter order creation error:", orderError);
      return NextResponse.json(
        { error: "Erreur lors de la creation de la commande" },
        { status: 500 }
      );
    }

    // Deduct wallet atomically if needed
    if (walletAmountUsed > 0 && walletId) {
      const { error: deductError } = await adminSupabase.rpc(
        "deduct_wallet_balance",
        {
          p_wallet_id: walletId,
          p_amount: walletAmountUsed,
          p_order_id: order.id,
        }
      );

      if (deductError) {
        await adminSupabase
          .from("orders")
          .update({ status: "cancelled" })
          .eq("id", order.id);
        return NextResponse.json(
          { error: "Solde insuffisant" },
          { status: 400 }
        );
      }
    }

    notifyAdmins(
      restaurant.id,
      restaurant_slug,
      displayOrderNumber,
      totalPrice
    );

    return NextResponse.json({
      order_id: order.id,
      display_order_number: displayOrderNumber,
      wallet_amount_used: walletAmountUsed,
      remainder: Math.max(0, totalPrice - walletAmountUsed),
      // Echo wallet balance pre-deduction for UI completeness
      wallet_balance_before: walletBalance,
    });
  } catch (err) {
    console.error("Counter order error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
