import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { AdminShell } from "@/components/admin/admin-shell";
import { isSuperAdmin } from "@/lib/super-admin";

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const headersList = await headers();
  const currentUrl = headersList.get("x-url") || "";
  const isDemo =
    process.env.NODE_ENV !== "production" && currentUrl.includes("demo=true");
  const supabase = await createClient();

  let restaurant;
  let userEmail = "";
  let ownedRestaurants: { name: string; slug: string }[] = [];
  let isSuperAdminUser = false;
  let actingAsSuperAdmin = false;
  let actingOwnerEmail: string | null = null;

  const RESTAURANT_FIELDS =
    "id, name, owner_id, is_accepting_orders, verification_status, opening_hours, delivery_enabled, delivery_addon_active";

  if (isDemo) {
    const { data } = await supabase
      .from("restaurants")
      .select(RESTAURANT_FIELDS)
      .eq("slug", slug)
      .single();

    if (!data) redirect("/admin/login");
    restaurant = data;
    ownedRestaurants = [{ name: data.name, slug }];
  } else {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/admin/login");
    userEmail = user.email || "";
    isSuperAdminUser = isSuperAdmin(user.email);

    // Super-admins can open any restaurant by slug (RLS allows it via the
    // super_admin_all permissive policy). Regular users are scoped to their
    // owned restaurants.
    let query = supabase
      .from("restaurants")
      .select(RESTAURANT_FIELDS)
      .eq("slug", slug);
    if (!isSuperAdminUser) {
      query = query.eq("owner_id", user.id);
    }
    const { data } = await query.single();

    if (!data) redirect(isSuperAdminUser ? "/super-admin/restaurants" : "/admin/login");
    restaurant = data;
    actingAsSuperAdmin = isSuperAdminUser && data.owner_id !== user.id;

    const { data: owned } = await supabase
      .from("restaurants")
      .select("name, slug")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: true });
    ownedRestaurants = owned || [];

    // When acting as super-admin on a non-owned restaurant, surface it in the
    // switcher so the active selection shows correctly.
    if (actingAsSuperAdmin) {
      ownedRestaurants = [
        { name: restaurant.name, slug },
        ...ownedRestaurants.filter((r) => r.slug !== slug),
      ];

      // Look up the real owner's email so we can show it in the banner.
      if (data.owner_id) {
        const { createAdminClient } = await import("@/lib/supabase/admin");
        const adminClient = createAdminClient();
        const { data: ownerRow } = await adminClient.auth.admin.getUserById(
          data.owner_id
        );
        actingOwnerEmail = ownerRow?.user?.email ?? null;
      }
    }
  }

  return (
    <AdminShell
      slug={slug}
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
      isSuperAdmin={isSuperAdminUser}
      actingAsSuperAdmin={actingAsSuperAdmin}
      actingOwnerEmail={actingOwnerEmail}
    >
      {children}
    </AdminShell>
  );
}
