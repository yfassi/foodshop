import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyStockAccess } from "@/lib/stock/auth";
import type { IngredientUnit } from "@/lib/types";

const VALID_UNITS: IngredientUnit[] = ["kg", "g", "l", "ml", "piece"];

function clampNumber(n: unknown, min = 0, max = 1_000_000) {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return null;
  if (v < min) return min;
  if (v > max) return max;
  return v;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const restaurantId = searchParams.get("restaurant_id");
  if (!restaurantId) {
    return NextResponse.json({ error: "restaurant_id manquant" }, { status: 400 });
  }
  const access = await verifyStockAccess(restaurantId);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("ingredients")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
  return NextResponse.json({ ingredients: data });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      restaurant_id,
      name,
      category,
      unit,
      current_qty,
      low_threshold,
      cost_per_unit_cents,
      supplier_id,
    } = body;

    if (!restaurant_id || !name || typeof name !== "string") {
      return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
    }
    if (name.length > 120) {
      return NextResponse.json({ error: "Nom trop long" }, { status: 400 });
    }
    if (!VALID_UNITS.includes(unit)) {
      return NextResponse.json({ error: "Unité invalide" }, { status: 400 });
    }

    const access = await verifyStockAccess(restaurant_id);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("ingredients")
      .insert({
        restaurant_id,
        name: name.trim(),
        category: category?.trim() || null,
        unit,
        current_qty: clampNumber(current_qty) ?? 0,
        low_threshold: clampNumber(low_threshold) ?? 0,
        cost_per_unit_cents:
          cost_per_unit_cents === null || cost_per_unit_cents === undefined
            ? null
            : clampNumber(cost_per_unit_cents, 0, 1_000_000_000),
        supplier_id: supplier_id || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Ingredient insert error:", error);
      return NextResponse.json({ error: "Erreur lors de la création" }, { status: 500 });
    }

    if ((clampNumber(current_qty) ?? 0) > 0) {
      await supabase.from("stock_movements").insert({
        restaurant_id,
        ingredient_id: data.id,
        delta: clampNumber(current_qty) ?? 0,
        reason: "opening",
        created_by: access.userId,
      });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const {
      id,
      restaurant_id,
      name,
      category,
      unit,
      low_threshold,
      cost_per_unit_cents,
      supplier_id,
    } = body;

    if (!id || !restaurant_id) {
      return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
    }
    const access = await verifyStockAccess(restaurant_id);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const updates: Record<string, unknown> = {};
    if (name !== undefined) {
      if (typeof name !== "string" || name.length > 120 || !name.trim()) {
        return NextResponse.json({ error: "Nom invalide" }, { status: 400 });
      }
      updates.name = name.trim();
    }
    if (category !== undefined) updates.category = category?.trim() || null;
    if (unit !== undefined) {
      if (!VALID_UNITS.includes(unit)) {
        return NextResponse.json({ error: "Unité invalide" }, { status: 400 });
      }
      updates.unit = unit;
    }
    if (low_threshold !== undefined) updates.low_threshold = clampNumber(low_threshold) ?? 0;
    if (cost_per_unit_cents !== undefined) {
      updates.cost_per_unit_cents =
        cost_per_unit_cents === null
          ? null
          : clampNumber(cost_per_unit_cents, 0, 1_000_000_000);
    }
    if (supplier_id !== undefined) updates.supplier_id = supplier_id || null;

    const supabase = createAdminClient();
    const { error } = await supabase
      .from("ingredients")
      .update(updates)
      .eq("id", id)
      .eq("restaurant_id", restaurant_id);

    if (error) {
      console.error("Ingredient update error:", error);
      return NextResponse.json({ error: "Erreur lors de la mise à jour" }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const restaurantId = searchParams.get("restaurant_id");
    if (!id || !restaurantId) {
      return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
    }
    const access = await verifyStockAccess(restaurantId);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const supabase = createAdminClient();
    const { error } = await supabase
      .from("ingredients")
      .delete()
      .eq("id", id)
      .eq("restaurant_id", restaurantId);

    if (error) {
      console.error("Ingredient delete error:", error);
      return NextResponse.json({ error: "Suppression impossible (utilisé ?)" }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
