import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { DeliveryConfig, DeliveryZone } from "@/lib/types";

function sanitizeConfig(raw: unknown): DeliveryConfig {
  const input = (raw ?? {}) as Record<string, unknown>;
  const coords =
    input.coords && typeof input.coords === "object"
      ? {
          lat: Number((input.coords as Record<string, unknown>).lat),
          lng: Number((input.coords as Record<string, unknown>).lng),
        }
      : undefined;

  const zonesRaw = Array.isArray(input.zones) ? (input.zones as unknown[]) : [];
  const zones: DeliveryZone[] = zonesRaw.map((z) => {
    const zone = z as Record<string, unknown>;
    return {
      id: String(zone.id || crypto.randomUUID()),
      label: String(zone.label || ""),
      radius_m: Math.max(0, Math.round(Number(zone.radius_m) || 0)),
      fee: Math.max(0, Math.round(Number(zone.fee) || 0)),
      min_order: Math.max(0, Math.round(Number(zone.min_order) || 0)),
    };
  });

  return {
    coords: coords && !Number.isNaN(coords.lat) && !Number.isNaN(coords.lng) ? coords : undefined,
    prep_time_minutes: Math.max(0, Math.round(Number(input.prep_time_minutes) || 0)) || undefined,
    max_radius_m: Math.max(0, Math.round(Number(input.max_radius_m) || 0)) || undefined,
    zones,
  };
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { restaurant_slug, delivery_enabled, delivery_config } = body;

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
      .select("id, owner_id, order_types, delivery_addon_active")
      .eq("slug", restaurant_slug)
      .single();

    if (!restaurant || restaurant.owner_id !== user.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    if (!restaurant.delivery_addon_active) {
      return NextResponse.json(
        { error: "Module Livraison non activé" },
        { status: 403 }
      );
    }

    const update: Record<string, unknown> = {};
    if (typeof delivery_enabled === "boolean") {
      update.delivery_enabled = delivery_enabled;
      const current: string[] = Array.isArray(restaurant.order_types)
        ? (restaurant.order_types as string[])
        : [];
      const next = delivery_enabled
        ? Array.from(new Set([...current, "delivery"]))
        : current.filter((t) => t !== "delivery");
      update.order_types = next;
    }
    if (delivery_config !== undefined) {
      update.delivery_config = sanitizeConfig(delivery_config);
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
    console.error("delivery-config error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
