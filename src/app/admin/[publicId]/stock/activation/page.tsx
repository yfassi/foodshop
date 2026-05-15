import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ActivationClient } from "./activation-client";

export default async function StockActivationPage({
  params,
  searchParams,
}: {
  params: Promise<{ publicId: string }>;
  searchParams: Promise<{ cancelled?: string }>;
}) {
  const { publicId } = await params;
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id, name, stock_module_active")
    .eq("public_id", publicId)
    .eq("owner_id", user.id)
    .single();

  if (!restaurant) redirect("/admin/login");

  if (restaurant.stock_module_active) {
    redirect(`/admin/${publicId}/stock`);
  }

  return (
    <ActivationClient
      restaurantId={restaurant.id}
      cancelled={sp.cancelled === "1"}
    />
  );
}
