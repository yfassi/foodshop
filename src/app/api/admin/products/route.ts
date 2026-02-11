import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function verifyAccess(restaurantId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const admin = createAdminClient();

  if (user) {
    const { data } = await admin
      .from("restaurants")
      .select("id")
      .eq("id", restaurantId)
      .eq("owner_id", user.id)
      .single();
    if (data) return true;
  }

  const { data } = await admin
    .from("restaurants")
    .select("id")
    .eq("id", restaurantId)
    .single();
  return !!data;
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
      .from("products")
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
