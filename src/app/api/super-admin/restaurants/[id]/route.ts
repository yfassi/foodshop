import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSuperAdmin } from "@/lib/super-admin";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isSuperAdmin(user.email)) {
    return NextResponse.json({ error: "Non autorise" }, { status: 403 });
  }

  const { id } = await params;
  const admin = createAdminClient();

  // Fetch restaurant
  const { data: restaurant, error } = await admin
    .from("restaurants")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !restaurant) {
    return NextResponse.json(
      { error: "Restaurant non trouve" },
      { status: 404 }
    );
  }

  // Fetch order stats
  const { data: orders } = await admin
    .from("orders")
    .select("id, total_price, status")
    .eq("restaurant_id", id);

  const validOrders = (orders || []).filter((o) => o.status !== "cancelled");
  const totalOrders = validOrders.length;
  const totalRevenue = validOrders.reduce(
    (sum, o) => sum + (o.total_price || 0),
    0
  );
  const avgTicket = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
  const cancelledOrders = (orders || []).filter(
    (o) => o.status === "cancelled"
  ).length;

  // Fetch owner email
  let ownerEmail: string | null = null;
  if (restaurant.owner_id) {
    const { data: ownerData } =
      await admin.auth.admin.getUserById(restaurant.owner_id);
    ownerEmail = ownerData?.user?.email || null;
  }

  // Fetch product & category counts
  const { count: categoryCount } = await admin
    .from("categories")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", id);

  const { data: categories } = await admin
    .from("categories")
    .select("id")
    .eq("restaurant_id", id);

  const catIds = (categories || []).map((c) => c.id);
  const { count: productCount } = await admin
    .from("products")
    .select("id", { count: "exact", head: true })
    .in("category_id", catIds.length > 0 ? catIds : ["__none__"]);

  return NextResponse.json({
    ...restaurant,
    owner_email: ownerEmail,
    stats: {
      total_orders: totalOrders,
      total_revenue: totalRevenue,
      avg_ticket: avgTicket,
      cancelled_orders: cancelledOrders,
      category_count: categoryCount || 0,
      product_count: productCount || 0,
    },
  });
}
