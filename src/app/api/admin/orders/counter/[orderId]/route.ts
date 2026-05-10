import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { OrderItem, OrderItemModifier } from "@/lib/types";

interface AddItem {
  product_id: string;
  product_name: string;
  quantity: number;
  is_menu?: boolean;
  modifiers: { modifier_id: string; group_id: string }[];
}

interface PatchBody {
  items: AddItem[];
}

/**
 * Append items to a counter order while it is still in "new" status.
 * Items inherit the order's payment terms — the operator pays the
 * difference at the counter on pickup; we don't re-trigger any payment
 * flow here. Each appended item gets an `added_at` timestamp so the
 * kitchen view can surface late additions as a delta block.
 */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ orderId: string }> },
) {
  try {
    const { orderId } = await context.params;
    const body = (await request.json()) as PatchBody;
    const items = body.items;

    if (!orderId || !items?.length) {
      return NextResponse.json(
        { error: "Donnees manquantes" },
        { status: 400 },
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

    const { data: order, error: orderFetchError } = await adminSupabase
      .from("orders")
      .select("id, restaurant_id, status, items, total_price")
      .eq("id", orderId)
      .single();

    if (orderFetchError || !order) {
      return NextResponse.json(
        { error: "Commande introuvable" },
        { status: 404 },
      );
    }

    const { data: restaurant } = await adminSupabase
      .from("restaurants")
      .select("id, owner_id")
      .eq("id", order.restaurant_id)
      .single();

    if (!restaurant || restaurant.owner_id !== user.id) {
      return NextResponse.json({ error: "Non autorise" }, { status: 403 });
    }

    if (order.status !== "new") {
      return NextResponse.json(
        { error: "Seules les commandes au statut Nouvelle sont modifiables" },
        { status: 400 },
      );
    }

    // Resolve products + modifiers (mirrors POST /counter validation).
    const productIds = items.map((i) => i.product_id);
    const { data: products } = await adminSupabase
      .from("products")
      .select("id, name, price, is_available, menu_supplement")
      .in("id", productIds);

    if (!products || products.length !== new Set(productIds).size) {
      return NextResponse.json(
        { error: "Produit(s) introuvable(s)" },
        { status: 400 },
      );
    }
    const productMap = new Map(products.map((p) => [p.id, p]));

    const allModifierIds = items.flatMap((i) =>
      i.modifiers.map((m) => m.modifier_id),
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
      i.modifiers.map((m) => m.group_id),
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

    const addedAt = new Date().toISOString();
    const newItems: OrderItem[] = [];
    let extra = 0;

    for (const item of items) {
      const product = productMap.get(item.product_id);
      if (!product || !product.is_available) {
        return NextResponse.json(
          { error: `${product?.name || "Produit"} n'est plus disponible` },
          { status: 400 },
        );
      }

      let menuSupplement = 0;
      if (item.is_menu) {
        if (product.menu_supplement == null) {
          return NextResponse.json(
            { error: `${product.name} ne propose pas l'option menu` },
            { status: 400 },
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
      extra += lineTotal;

      newItems.push({
        product_id: product.id,
        product_name: product.name,
        quantity: item.quantity,
        unit_price: product.price + menuSupplement,
        modifiers: orderModifiers,
        line_total: lineTotal,
        added_at: addedAt,
        ...(item.is_menu && {
          is_menu: true,
          menu_supplement: menuSupplement,
        }),
      });
    }

    if (extra <= 0) {
      return NextResponse.json({ error: "Total invalide" }, { status: 400 });
    }

    const mergedItems = [...(order.items as OrderItem[]), ...newItems];
    const newTotal = order.total_price + extra;

    const { error: updateError } = await adminSupabase
      .from("orders")
      .update({ items: mergedItems, total_price: newTotal })
      .eq("id", orderId);

    if (updateError) {
      console.error("Counter order patch error:", updateError);
      return NextResponse.json(
        { error: "Erreur lors de la mise a jour" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      order_id: orderId,
      added_count: newItems.length,
      added_at: addedAt,
      total_price: newTotal,
      extra,
    });
  } catch (err) {
    console.error("Counter order patch error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
