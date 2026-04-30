import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { StockMovementType } from "@/lib/types";

const VALID_TYPES: StockMovementType[] = ["in", "out", "adjustment"];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { restaurant_slug, stock_item_id, type, quantity, reason } = body;

    if (!restaurant_slug || !stock_item_id || !type || quantity === undefined) {
      return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
    }
    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: "Type invalide" }, { status: 400 });
    }

    const qty = Number(quantity);
    if (Number.isNaN(qty) || qty === 0) {
      return NextResponse.json({ error: "Quantité invalide" }, { status: 400 });
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
      .select("id, owner_id, stock_addon_active")
      .eq("slug", restaurant_slug)
      .single();

    if (!restaurant || restaurant.owner_id !== user.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }
    if (!restaurant.stock_addon_active) {
      return NextResponse.json({ error: "Module Stock non activé" }, { status: 403 });
    }

    // Ensure the item belongs to this restaurant
    const { data: item } = await supabase
      .from("stock_items")
      .select("id, current_qty")
      .eq("id", stock_item_id)
      .eq("restaurant_id", restaurant.id)
      .single();

    if (!item) {
      return NextResponse.json({ error: "Item introuvable" }, { status: 404 });
    }

    // Compute signed delta
    let delta = qty;
    if (type === "in") delta = Math.abs(qty);
    else if (type === "out") delta = -Math.abs(qty);
    // 'adjustment' keeps the sign as-is

    const { data, error } = await supabase
      .from("stock_movements")
      .insert({
        restaurant_id: restaurant.id,
        stock_item_id,
        type,
        quantity: delta,
        reason: reason ? String(reason).trim() : null,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ movement: data });
  } catch (err) {
    console.error("stock movements POST error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
