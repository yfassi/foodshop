import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const publicId = searchParams.get("restaurant_public_id");
    if (!publicId) {
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
      .select("id, name")
      .eq("public_id", publicId)
      .single();

    if (!restaurant) {
      return NextResponse.json({ error: "Restaurant introuvable" }, { status: 404 });
    }

    const { data: driver } = await supabase
      .from("drivers")
      .select("id")
      .eq("user_id", user.id)
      .eq("restaurant_id", restaurant.id)
      .eq("is_active", true)
      .maybeSingle();

    if (!driver) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const since = new Date();
    since.setHours(0, 0, 0, 0);

    const { data: orders } = await supabase
      .from("orders")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .eq("order_type", "delivery")
      .or(`driver_id.eq.${driver.id},driver_id.is.null`)
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: false });

    return NextResponse.json({
      orders: orders || [],
      driver,
      restaurant,
    });
  } catch (err) {
    console.error("driver deliveries error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
