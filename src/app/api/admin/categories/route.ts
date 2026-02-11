import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function verifyAccess(restaurantId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const admin = createAdminClient();

  // Authenticated owner
  if (user) {
    const { data } = await admin
      .from("restaurants")
      .select("id")
      .eq("id", restaurantId)
      .eq("owner_id", user.id)
      .single();
    if (data) return true;
  }

  // Demo mode: allow if restaurant exists
  const { data } = await admin
    .from("restaurants")
    .select("id")
    .eq("id", restaurantId)
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

    if (!(await verifyAccess(restaurant_id))) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("categories")
      .insert({ name, icon, restaurant_id, sort_order: sort_order ?? 0 })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, restaurant_id, ...updates } = body;

    if (!id || !restaurant_id) {
      return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
    }

    if (!(await verifyAccess(restaurant_id))) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const supabase = createAdminClient();
    const { error } = await supabase
      .from("categories")
      .update(updates)
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
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
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
