import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { matchZone } from "@/lib/delivery";
import type { DeliveryConfig } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const { restaurant_public_id, lat, lng } = await request.json();
    if (!restaurant_public_id || typeof lat !== "number" || typeof lng !== "number") {
      return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: restaurant } = await supabase
      .from("restaurants")
      .select(
        "id, delivery_addon_active, delivery_enabled, delivery_config, order_types"
      )
      .eq("public_id", restaurant_public_id)
      .single();

    if (!restaurant) {
      return NextResponse.json({ error: "Restaurant introuvable" }, { status: 404 });
    }
    if (
      !restaurant.delivery_addon_active ||
      !restaurant.delivery_enabled ||
      !(restaurant.order_types as string[] | null)?.includes("delivery")
    ) {
      return NextResponse.json(
        { error: "Livraison non activée" },
        { status: 403 }
      );
    }

    const config = (restaurant.delivery_config || {}) as DeliveryConfig;
    const match = matchZone(config, { lat, lng });
    if (!match) {
      return NextResponse.json({ error: "out_of_zone" }, { status: 200 });
    }

    return NextResponse.json({
      zone_id: match.zone.id,
      zone_label: match.zone.label,
      fee: match.zone.fee,
      min_order: match.zone.min_order,
      distance_m: match.distance_m,
      prep_time_minutes: config.prep_time_minutes ?? null,
    });
  } catch (err) {
    console.error("calculate delivery fee error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
