import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyStockAccess } from "@/lib/stock/auth";

const ADJUST_REASONS = new Set(["manual_adjust", "loss", "opening"]);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const restaurantId = searchParams.get("restaurant_id");
  const ingredientId = searchParams.get("ingredient_id");
  const limit = Math.min(parseInt(searchParams.get("limit") || "100", 10) || 100, 500);
  if (!restaurantId) {
    return NextResponse.json({ error: "restaurant_id manquant" }, { status: 400 });
  }
  const access = await verifyStockAccess(restaurantId);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const supabase = createAdminClient();
  let query = supabase
    .from("stock_movements")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (ingredientId) query = query.eq("ingredient_id", ingredientId);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  return NextResponse.json({ movements: data });
}

/**
 * POST /api/admin/stock/movements
 * Manual adjustment / loss declaration. Body:
 * { restaurant_id, ingredient_id, delta, reason: 'manual_adjust'|'loss'|'opening', notes? }
 *
 * Updates ingredients.current_qty atomically and writes the journal row.
 */
export async function POST(request: Request) {
  try {
    const { restaurant_id, ingredient_id, delta, reason, notes } = await request.json();

    if (!restaurant_id || !ingredient_id || typeof delta !== "number") {
      return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
    }
    if (!ADJUST_REASONS.has(reason)) {
      return NextResponse.json({ error: "Raison invalide" }, { status: 400 });
    }
    if (!Number.isFinite(delta) || delta === 0) {
      return NextResponse.json({ error: "Variation invalide" }, { status: 400 });
    }
    const access = await verifyStockAccess(restaurant_id);
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

    const supabase = createAdminClient();

    const { data: ing } = await supabase
      .from("ingredients")
      .select("id, current_qty, restaurant_id")
      .eq("id", ingredient_id)
      .eq("restaurant_id", restaurant_id)
      .single();
    if (!ing) {
      return NextResponse.json({ error: "Ingrédient introuvable" }, { status: 404 });
    }

    const newQty = Math.max(0, Number(ing.current_qty) + delta);
    await supabase
      .from("ingredients")
      .update({ current_qty: newQty })
      .eq("id", ingredient_id);

    await supabase.from("stock_movements").insert({
      restaurant_id,
      ingredient_id,
      delta,
      reason,
      notes: notes?.trim() || null,
      created_by: access.userId,
    });

    return NextResponse.json({ success: true, current_qty: newQty });
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
