import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { IngredientsClient } from "@/components/admin/stock/ingredients-client";

export default async function StockIngredientsPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id, stock_module_active")
    .eq("public_id", publicId)
    .eq("owner_id", user.id)
    .single();
  if (!restaurant) redirect("/admin/login");
  if (!restaurant.stock_module_active) redirect(`/admin/${publicId}/stock/activation`);

  return <IngredientsClient publicId={publicId} restaurantId={restaurant.id} />;
}
