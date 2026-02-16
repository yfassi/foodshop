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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, icon, restaurant_id, sort_order } = body;

    if (!name || !restaurant_id) {
      return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
    }

    if (typeof name !== "string" || name.length > 100) {
      return NextResponse.json({ error: "Nom invalide" }, { status: 400 });
    }

    if (!(await verifyAccess(restaurant_id))) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("categories")
      .insert({ name, icon: icon || null, restaurant_id, sort_order: sort_order ?? 0 })
      .select()
      .single();

    if (error) {
      console.error("Category insert error:", error);
      return NextResponse.json({ error: "Erreur lors de la création" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, restaurant_id, name, icon, sort_order, is_visible } = body;

    if (!id || !restaurant_id) {
      return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
    }

    if (name !== undefined && (typeof name !== "string" || name.length > 100)) {
      return NextResponse.json({ error: "Nom invalide" }, { status: 400 });
    }

    if (!(await verifyAccess(restaurant_id))) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    // Whitelist allowed fields
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (icon !== undefined) updates.icon = icon;
    if (sort_order !== undefined) updates.sort_order = sort_order;
    if (is_visible !== undefined) updates.is_visible = is_visible;

    const supabase = createAdminClient();
    const { error } = await supabase
      .from("categories")
      .update(updates)
      .eq("id", id)
      .eq("restaurant_id", restaurant_id);

    if (error) {
      console.error("Category update error:", error);
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

    if (!(await verifyAccess(restaurantId))) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const supabase = createAdminClient();
    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", id)
      .eq("restaurant_id", restaurantId);

    if (error) {
      console.error("Category delete error:", error);
      return NextResponse.json({ error: "Erreur lors de la suppression" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
