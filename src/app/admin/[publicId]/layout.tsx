import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveCanonicalPublicId } from "@/lib/resolve-restaurant";
import { AdminShell } from "@/components/admin/admin-shell";
import { isSuperAdmin } from "@/lib/super-admin";
import { PREFS_BOOT_SCRIPT } from "@/components/admin/user-preferences";

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
  let isSuperAdminUser = false;
  let actingAsSuperAdmin = false;
  let actingOwnerEmail: string | null = null;

  const RESTAURANT_FIELDS =
    "id, name, owner_id, is_accepting_orders, verification_status, opening_hours, delivery_enabled, delivery_addon_active, stock_enabled, stock_module_active, subscription_tier";

  if (isDemo) {
    const { data } = await supabase
      .from("restaurants")
      .select(RESTAURANT_FIELDS)
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
    isSuperAdminUser = isSuperAdmin(user.email);

    // Super-admins can open any restaurant by public_id (RLS allows it via the
    // super_admin_all permissive policy). Regular users are scoped to their
    // owned restaurants.
    let query = supabase
      .from("restaurants")
      .select(RESTAURANT_FIELDS)
      .eq("public_id", publicId);
    if (!isSuperAdminUser) {
      query = query.eq("owner_id", user.id);
    }
    const { data } = await query.single();

    if (!data) redirect(isSuperAdminUser ? "/super-admin/restaurants" : "/admin/login");
    restaurant = data;
    actingAsSuperAdmin = isSuperAdminUser && data.owner_id !== user.id;

    const { data: owned } = await supabase
      .from("restaurants")
      .select("name, public_id")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: true });
    ownedRestaurants = owned || [];

    // When acting as super-admin on a non-owned restaurant, surface it in the
    // switcher so the active selection shows correctly.
    if (actingAsSuperAdmin) {
      ownedRestaurants = [
        { name: restaurant.name, public_id: publicId },
        ...ownedRestaurants.filter((r) => r.public_id !== publicId),
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

  const { normalizeTier } = await import("@/lib/subscription");
  const planId = normalizeTier(restaurant.subscription_tier);
  const activeAddons: ("livraison" | "stock")[] = [];
  if (restaurant.delivery_addon_active) activeAddons.push("livraison");
  if (restaurant.stock_module_active) activeAddons.push("stock");

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: PREFS_BOOT_SCRIPT }} />
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
      stockEnabled={
        restaurant.stock_enabled && restaurant.stock_module_active
      }
      restaurants={ownedRestaurants}
      isSuperAdmin={isSuperAdminUser}
      actingAsSuperAdmin={actingAsSuperAdmin}
      actingOwnerEmail={actingOwnerEmail}
      planId={planId}
      activeAddons={activeAddons}
    >
      {children}
    </AdminShell>
    </>
  );
}
