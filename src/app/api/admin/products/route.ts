import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function verifyAccess(restaurantId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const admin = createAdminClient();
  const { data } = await admin
    .from("restaurants")
    .select("id")
    .eq("id", restaurantId)
    .eq("owner_id", user.id)
    .single();

  return !!data;
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, restaurant_id, name, description, price, is_available, sort_order, image_url, category_id } = body;

    if (!id || !restaurant_id) {
      return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
    }

    if (name !== undefined && (typeof name !== "string" || name.length > 200)) {
      return NextResponse.json({ error: "Nom invalide" }, { status: 400 });
    }

    if (!(await verifyAccess(restaurant_id))) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    // Whitelist allowed fields
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (price !== undefined) updates.price = price;
    if (is_available !== undefined) updates.is_available = is_available;
    if (sort_order !== undefined) updates.sort_order = sort_order;
    if (image_url !== undefined) updates.image_url = image_url;
    if (category_id !== undefined) updates.category_id = category_id;

    const supabase = createAdminClient();
    const { error } = await supabase
      .from("products")
      .update(updates)
      .eq("id", id);

    if (error) {
      console.error("Product update error:", error);
      return NextResponse.json({ error: "Erreur lors de la mise à jour" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
