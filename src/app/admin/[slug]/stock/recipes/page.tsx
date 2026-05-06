import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RecipesClient } from "@/components/admin/stock/recipes-client";

export default async function StockRecipesPage({
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

  const { data: products } = await supabase
    .from("products")
    .select("id, name, categories!inner(restaurant_id)")
    .eq("categories.restaurant_id", restaurant.id)
    .order("name", { ascending: true });

  const flatProducts =
    (products as { id: string; name: string }[] | null)?.map((p) => ({
      id: p.id,
      name: p.name,
    })) || [];

  return (
    <RecipesClient
      slug={slug}
      restaurantId={restaurant.id}
      products={flatProducts}
    />
  );
}
