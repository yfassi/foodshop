import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { restaurant_slug, stock_enabled } = body;

    if (!restaurant_slug) {
      return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
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
      return NextResponse.json(
        { error: "Module Stock non activé" },
        { status: 403 }
      );
    }

    const update: Record<string, unknown> = {};
    if (typeof stock_enabled === "boolean") {
      update.stock_enabled = stock_enabled;
    }

    const { error } = await supabase
      .from("restaurants")
      .update(update)
      .eq("id", restaurant.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("stock-config error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
