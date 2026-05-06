import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ScanClient } from "@/components/admin/stock/scan-client";

export default async function StockScanPage({
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

  return <ScanClient slug={slug} restaurantId={restaurant.id} />;
}
