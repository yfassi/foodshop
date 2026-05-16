import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSuperAdmin } from "@/lib/super-admin";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isSuperAdmin(user.email)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const filter = searchParams.get("filter") || "all";

  const admin = createAdminClient();

  // Fetch all restaurants
  let query = admin
    .from("restaurants")
    .select("*")
    .order("created_at", { ascending: false });

  if (filter === "active") query = query.eq("is_active", true);
  if (filter === "inactive") query = query.eq("is_active", false);
  if (filter === "pending") query = query.eq("verification_status", "pending");

  const { data: restaurants, error } = await query;

  if (error) {
    console.error("Super-admin restaurants error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }

  let filtered = restaurants || [];

  // Client-side search filter (name or slug)
  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter(
      (r) =>
        r.name.toLowerCase().includes(s) || r.slug.toLowerCase().includes(s)
    );
  }

  // Fetch order stats per restaurant
  const restaurantIds = filtered.map((r) => r.id);

  const { data: orders } = await admin
    .from("orders")
    .select("restaurant_id, total_price, status")
    .in(
      "restaurant_id",
      restaurantIds.length > 0 ? restaurantIds : ["__none__"]
    );

  // Aggregate stats
  const statsMap: Record<string, { order_count: number; total_revenue: number }> = {};
  for (const order of orders || []) {
    if (order.status === "cancelled") continue;
    if (!statsMap[order.restaurant_id]) {
      statsMap[order.restaurant_id] = { order_count: 0, total_revenue: 0 };
    }
    statsMap[order.restaurant_id].order_count++;
    statsMap[order.restaurant_id].total_revenue += order.total_price || 0;
  }

  const enriched = filtered.map((r) => ({
    ...r,
    order_count: statsMap[r.id]?.order_count || 0,
    total_revenue: statsMap[r.id]?.total_revenue || 0,
  }));

  return NextResponse.json(enriched);
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isSuperAdmin(user.email)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const body = await request.json();
  const { id } = body;

  if (!id) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  const update: Record<string, unknown> = {};

  if (typeof body.is_active === "boolean") update.is_active = body.is_active;
  if (typeof body.is_accepting_orders === "boolean")
    update.is_accepting_orders = body.is_accepting_orders;

  if (
    body.verification_status &&
    ["pending", "verified", "rejected"].includes(body.verification_status)
  ) {
    update.verification_status = body.verification_status;
  }

  if (
    body.subscription_tier &&
    ["essentiel", "pro", "groupe"].includes(body.subscription_tier)
  ) {
    update.subscription_tier = body.subscription_tier;
  }

  // Free-text fields
  for (const field of [
    "name",
    "slug",
    "description",
    "address",
    "phone",
    "restaurant_type",
    "siret",
  ] as const) {
    if (typeof body[field] === "string") {
      update[field] = body[field].trim() || null;
    }
  }

  // Boolean addon flags. Note: split_payment_enabled and floor_plan are not
  // present on every environment yet (migration 016 partially applied), so we
  // leave them out here and let the restaurateur's settings page handle them.
  for (const flag of [
    "delivery_addon_active",
    "delivery_enabled",
    "stock_module_active",
    "stock_enabled",
    "loyalty_enabled",
  ] as const) {
    if (typeof body[flag] === "boolean") update[flag] = body[flag];
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { error } = await admin
    .from("restaurants")
    .update(update)
    .eq("id", id);

  if (error) {
    console.error("Super-admin restaurants error:", error);
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Ce slug est deja utilise par un autre restaurant" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
