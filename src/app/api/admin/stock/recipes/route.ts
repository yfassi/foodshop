import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyStockAccess } from "@/lib/stock/auth";

interface IncomingRecipeItem {
  ingredient_id: string;
  quantity: number;
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
  const { data: recipes, error: recipesErr } = await supabase
    .from("recipes")
    .select("id, product_id, restaurant_id, is_enabled, created_at, updated_at")
    .eq("restaurant_id", restaurantId);

  if (recipesErr) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }

  const recipeIds = (recipes || []).map((r) => r.id);
  let items: { id: string; recipe_id: string; ingredient_id: string; quantity: number }[] = [];
  if (recipeIds.length) {
    const { data: itemsData, error: itemsErr } = await supabase
      .from("recipe_items")
      .select("id, recipe_id, ingredient_id, quantity")
      .in("recipe_id", recipeIds);
    if (itemsErr) {
      return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
    items = itemsData || [];
  }

  return NextResponse.json({ recipes: recipes || [], items });
}

/**
 * PUT /api/admin/stock/recipes
 * Replaces the recipe + recipe_items for a given product in one shot.
 * Body: { restaurant_id, product_id, is_enabled?: boolean,
 *         items: [{ ingredient_id, quantity }] }
 */
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { restaurant_id, product_id, is_enabled, items } = body as {
      restaurant_id: string;
      product_id: string;
      is_enabled?: boolean;
      items: IncomingRecipeItem[];
    };

    if (!restaurant_id || !product_id || !Array.isArray(items)) {
      return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
    }
    const access = await verifyStockAccess(restaurant_id);
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

    const supabase = createAdminClient();

    // Verify the product belongs to this restaurant via its category
    const { data: prod } = await supabase
      .from("products")
      .select("id, categories!inner(restaurant_id)")
      .eq("id", product_id)
      .single<{ id: string; categories: { restaurant_id: string } }>();
    if (!prod || prod.categories?.restaurant_id !== restaurant_id) {
      return NextResponse.json({ error: "Produit inconnu" }, { status: 404 });
    }

    // Validate items
    const cleanItems: IncomingRecipeItem[] = [];
    for (const it of items) {
      if (!it.ingredient_id) continue;
      const q = Number(it.quantity);
      if (!Number.isFinite(q) || q <= 0) continue;
      cleanItems.push({ ingredient_id: it.ingredient_id, quantity: q });
    }

    // Make sure all ingredients belong to this restaurant
    if (cleanItems.length > 0) {
      const ingIds = cleanItems.map((i) => i.ingredient_id);
      const { data: owned } = await supabase
        .from("ingredients")
        .select("id")
        .eq("restaurant_id", restaurant_id)
        .in("id", ingIds);
      const ownedIds = new Set((owned || []).map((r) => r.id));
      for (const it of cleanItems) {
        if (!ownedIds.has(it.ingredient_id)) {
          return NextResponse.json(
            { error: "Ingrédient invalide" },
            { status: 400 }
          );
        }
      }
    }

    // Upsert recipe
    let recipeId: string;
    const { data: existing } = await supabase
      .from("recipes")
      .select("id")
      .eq("product_id", product_id)
      .single();
    if (existing) {
      recipeId = existing.id;
      await supabase
        .from("recipes")
        .update({ is_enabled: is_enabled ?? true })
        .eq("id", recipeId);
    } else {
      const { data: created, error: createErr } = await supabase
        .from("recipes")
        .insert({ product_id, restaurant_id, is_enabled: is_enabled ?? true })
        .select("id")
        .single();
      if (createErr || !created) {
        console.error("Recipe insert error:", createErr);
        return NextResponse.json({ error: "Erreur lors de la création" }, { status: 500 });
      }
      recipeId = created.id;
    }

    // Replace items: delete + insert
    await supabase.from("recipe_items").delete().eq("recipe_id", recipeId);
    if (cleanItems.length > 0) {
      const rows = cleanItems.map((i) => ({
        recipe_id: recipeId,
        ingredient_id: i.ingredient_id,
        quantity: i.quantity,
      }));
      const { error: insertErr } = await supabase.from("recipe_items").insert(rows);
      if (insertErr) {
        console.error("Recipe items insert error:", insertErr);
        return NextResponse.json({ error: "Erreur lors de la sauvegarde" }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, recipe_id: recipeId });
  } catch (err) {
    console.error("Recipe PUT error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("product_id");
    const restaurantId = searchParams.get("restaurant_id");
    if (!productId || !restaurantId) {
      return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
    }
    const access = await verifyStockAccess(restaurantId);
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

    const supabase = createAdminClient();
    const { error } = await supabase
      .from("recipes")
      .delete()
      .eq("product_id", productId)
      .eq("restaurant_id", restaurantId);
    if (error) return NextResponse.json({ error: "Erreur" }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
