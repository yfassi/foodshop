import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { resolveCanonicalPublicId } from "@/lib/resolve-restaurant";
import { AdminShell } from "@/components/admin/admin-shell";

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ publicId: string }>;
}) {
  const { publicId: param } = await params;
  const headersList = await headers();
  const currentUrl = headersList.get("x-url") || "";
  const isDemo =
    process.env.NODE_ENV !== "production" && currentUrl.includes("demo=true");
  const supabase = await createClient();

  // Resolve legacy slug → public_id (issues a redirect if needed)
  const publicId = await resolveCanonicalPublicId(supabase, param);
  if (!publicId) redirect("/admin/login");

  let restaurant;
  let userEmail = "";
  let ownedRestaurants: { name: string; public_id: string }[] = [];

  if (isDemo) {
    const { data } = await supabase
      .from("restaurants")
      .select("id, name, is_accepting_orders, verification_status, opening_hours, delivery_enabled, delivery_addon_active")
      .eq("public_id", publicId)
      .single();

    if (!data) redirect("/admin/login");
    restaurant = data;
    ownedRestaurants = [{ name: data.name, public_id: publicId }];
  } else {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/admin/login");
    userEmail = user.email || "";

    const { data } = await supabase
      .from("restaurants")
      .select("id, name, is_accepting_orders, verification_status, opening_hours, delivery_enabled, delivery_addon_active")
      .eq("public_id", publicId)
      .eq("owner_id", user.id)
      .single();

    if (!data) redirect("/admin/login");
    restaurant = data;

    const { data: owned } = await supabase
      .from("restaurants")
      .select("name, public_id")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: true });
    ownedRestaurants = owned || [];
  }

  return (
    <AdminShell
      publicId={publicId}
      restaurantId={restaurant.id}
      restaurantName={restaurant.name}
      verificationStatus={restaurant.verification_status}
      isDemo={isDemo}
      userEmail={userEmail}
      openingHours={restaurant.opening_hours as Record<string, unknown> | null}
      isAcceptingOrders={restaurant.is_accepting_orders}
      deliveryEnabled={
        restaurant.delivery_enabled && restaurant.delivery_addon_active
      }
      restaurants={ownedRestaurants}
    >
      {children}
    </AdminShell>
  );
}
