import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SuppliersClient } from "@/components/admin/stock/suppliers-client";

export default async function StockSuppliersPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id, stock_module_active")
    .eq("slug", slug)
    .eq("owner_id", user.id)
    .single();
  if (!restaurant) redirect("/admin/login");
  if (!restaurant.stock_module_active) redirect(`/admin/${slug}/stock/activation`);

  return <SuppliersClient slug={slug} restaurantId={restaurant.id} />;
}
