import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Returns minimal status fields for an order. The orderId UUID acts as a
// magic-link token (unguessable), mirroring the order-confirmation page.
// Used by anon customers who can no longer use Supabase Realtime after
// migration 016 tightened RLS on the orders table.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: order, error } = await supabase
    .from("orders")
    .select("status, delivery_status, driver_id")
    .eq("id", id)
    .single();

  if (error || !order) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let driver: { id: string; full_name: string; phone: string | null } | null =
    null;
  if (order.driver_id) {
    const { data: d } = await supabase
      .from("drivers")
      .select("id, full_name, phone")
      .eq("id", order.driver_id)
      .single();
    if (d) driver = d;
  }

  return NextResponse.json({
    status: order.status,
    delivery_status: order.delivery_status,
    driver,
  });
}
