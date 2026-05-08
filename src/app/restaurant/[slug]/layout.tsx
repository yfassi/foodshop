import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RestaurantHeader } from "@/components/restaurant/restaurant-header";
import { ClosedBanner } from "@/components/restaurant/closed-banner";
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
    <div className="min-h-screen bg-[#F5EBDB]">
      <div className="mx-auto min-h-screen max-w-3xl bg-[#F5EBDB] shadow-sm lg:my-6 lg:min-h-0 lg:rounded-2xl lg:border lg:border-[#E6D9C2] lg:shadow-lg lg:shadow-black/[0.04]">
        <RestaurantHeader restaurant={restaurant} />
        <ClosedBanner
          isAcceptingOrders={restaurant.is_accepting_orders}
          openingHours={restaurant.opening_hours as Record<string, unknown> | null}
        />
        <div className="pb-24">{children}</div>
        <footer className="border-t border-[#E6D9C2] py-4 text-center text-[10px] text-[#a89e94]">
          Propulsé par TaapR — Tous droits réservés
        </footer>
      </div>
    </div>
  );
}
