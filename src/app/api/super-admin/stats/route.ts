import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSuperAdmin } from "@/lib/super-admin";

function getStartDate(period: string): Date {
  const now = new Date();
  if (period === "7days") {
    return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }
  if (period === "30days") {
    return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
  // today
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  return start;
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isSuperAdmin(user.email)) {
    return NextResponse.json({ error: "Non autorise" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") || "today";
  const startDate = getStartDate(period);

  const admin = createAdminClient();

  // Fetch restaurants
  const { data: restaurants } = await admin
    .from("restaurants")
    .select("id, name, slug, is_active, created_at")
    .order("created_at", { ascending: false });

  // Fetch orders in period
  const { data: orders } = await admin
    .from("orders")
    .select("id, total_price, status, created_at")
    .gte("created_at", startDate.toISOString());

  const allRestaurants = restaurants || [];
  const allOrders = (orders || []).filter((o) => o.status !== "cancelled");

  const totalRevenue = allOrders.reduce((sum, o) => sum + (o.total_price || 0), 0);

  // Orders by day (for charts)
  const ordersByDay: Record<string, { count: number; revenue: number }> = {};
  for (const order of allOrders) {
    const day = new Date(order.created_at).toISOString().split("T")[0];
    if (!ordersByDay[day]) ordersByDay[day] = { count: 0, revenue: 0 };
    ordersByDay[day].count++;
    ordersByDay[day].revenue += order.total_price || 0;
  }

  const chartData = Object.entries(ordersByDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({ date, ...data }));

  return NextResponse.json({
    totalRestaurants: allRestaurants.length,
    activeRestaurants: allRestaurants.filter((r) => r.is_active).length,
    totalOrders: allOrders.length,
    totalRevenue,
    recentRestaurants: allRestaurants.slice(0, 5),
    ordersByDay: chartData,
  });
}
