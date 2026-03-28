import { redirect } from "next/navigation";
import { headers } from "next/headers";
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
  const headersList = await headers();
  const currentUrl = headersList.get("x-url") || "";
  const isDemo =
    process.env.NODE_ENV !== "production" && currentUrl.includes("demo=true");
  const supabase = await createClient();

  let restaurant;
  let userEmail = "";

  if (isDemo) {
    const { data } = await supabase
      .from("restaurants")
      .select("id, name, is_accepting_orders, verification_status, opening_hours")
      .eq("slug", slug)
      .single();

    if (!data) redirect("/admin/login");
    restaurant = data;
  } else {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/admin/login");
    userEmail = user.email || "";

    const { data } = await supabase
      .from("restaurants")
      .select("id, name, is_accepting_orders, verification_status, opening_hours")
      .eq("slug", slug)
      .eq("owner_id", user.id)
      .single();

    if (!data) redirect("/admin/login");
    restaurant = data;
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
    >
      {children}
    </AdminShell>
  );
}
