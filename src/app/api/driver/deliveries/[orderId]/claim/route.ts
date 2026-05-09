import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;

    const serverSupabase = await createClient();
    const {
      data: { user },
    } = await serverSupabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { data: order } = await supabase
      .from("orders")
      .select("id, restaurant_id, driver_id, order_type, delivery_status")
      .eq("id", orderId)
      .single();

    if (!order || order.order_type !== "delivery") {
      return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
    }

    const { data: driver } = await supabase
      .from("drivers")
      .select("id")
      .eq("user_id", user.id)
      .eq("restaurant_id", order.restaurant_id)
      .eq("is_active", true)
      .maybeSingle();

    if (!driver) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    if (order.driver_id && order.driver_id !== driver.id) {
      return NextResponse.json(
        { error: "Cette commande est déjà prise en charge" },
        { status: 409 }
      );
    }

    const { error } = await supabase
      .from("orders")
      .update({
        driver_id: driver.id,
        delivery_status: "assigned",
        assigned_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (error) {
      console.error("Claim delivery error:", error);
      return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("claim delivery error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
