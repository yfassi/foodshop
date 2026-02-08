import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RestaurantHeader } from "@/components/restaurant/restaurant-header";
import type { Restaurant } from "@/lib/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("name, description")
    .eq("slug", slug)
    .single();

  if (!restaurant) return { title: "Restaurant introuvable" };

  return {
    title: `${restaurant.name} - Commandez en ligne`,
    description: restaurant.description,
  };
}

export default async function RestaurantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("*")
    .eq("slug", slug)
    .single<Restaurant>();

  if (!restaurant) notFound();

  return (
    <div className="mx-auto min-h-screen max-w-3xl bg-background shadow-sm lg:my-6 lg:rounded-2xl lg:border lg:border-border">
      <RestaurantHeader restaurant={restaurant} />
      {!restaurant.is_accepting_orders && (
        <div className="bg-red-50 px-4 py-3 text-center text-sm font-medium text-red-600">
          Le restaurant ne prend plus de commandes pour le moment.
        </div>
      )}
      <main className="pb-24">{children}</main>
    </div>
  );
}
