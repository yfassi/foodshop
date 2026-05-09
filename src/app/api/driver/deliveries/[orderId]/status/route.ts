import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { DeliveryStatus } from "@/lib/types";

const ALLOWED: DeliveryStatus[] = ["picked_up", "delivered", "failed"];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    const { status } = await request.json();

    if (!ALLOWED.includes(status)) {
      return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
    }

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
      .select("id, restaurant_id, driver_id, order_type")
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

    if (!driver || order.driver_id !== driver.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const now = new Date().toISOString();
    const update: Record<string, unknown> = { delivery_status: status };
    if (status === "picked_up") update.picked_up_at = now;
    if (status === "delivered") {
      update.delivered_at = now;
      update.status = "done";
    }
    if (status === "failed") update.status = "cancelled";

    const { error } = await supabase.from("orders").update(update).eq("id", orderId);
    if (error) {
      console.error("Driver delivery status error:", error);
      return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("delivery status error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
