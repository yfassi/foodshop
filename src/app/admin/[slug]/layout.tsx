import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminShell } from "@/components/admin/admin-shell";

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");
  const userEmail = user.email || "";

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id, name, is_accepting_orders, verification_status, opening_hours, delivery_enabled, delivery_addon_active, stock_enabled, stock_module_active")
    .eq("slug", slug)
    .eq("owner_id", user.id)
    .single();

  if (!restaurant) redirect("/admin/login");

  const { data: owned } = await supabase
    .from("restaurants")
    .select("name, slug")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true });
  const ownedRestaurants = owned || [];

  return (
    <AdminShell
      slug={slug}
      restaurantId={restaurant.id}
      restaurantName={restaurant.name}
      verificationStatus={restaurant.verification_status}
      userEmail={userEmail}
      openingHours={restaurant.opening_hours as Record<string, unknown> | null}
      isAcceptingOrders={restaurant.is_accepting_orders}
      deliveryEnabled={
        restaurant.delivery_enabled && restaurant.delivery_addon_active
      }
      stockEnabled={
        restaurant.stock_enabled && restaurant.stock_module_active
      }
      restaurants={ownedRestaurants}
    >
      {children}
    </AdminShell>
  );
}
