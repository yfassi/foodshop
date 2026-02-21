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
    return NextResponse.json({ error: "Non autorise" }, { status: 403 });
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

  const { data: restaurants, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
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
    return NextResponse.json({ error: "Non autorise" }, { status: 403 });
  }

  const body = await request.json();
  const { id, is_active } = body;

  if (!id || typeof is_active !== "boolean") {
    return NextResponse.json({ error: "Donnees invalides" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { error } = await admin
    .from("restaurants")
    .update({ is_active })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
