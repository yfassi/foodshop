"use client";

import { useState } from "react";
import Image from "next/image";
import { Info } from "lucide-react";
import type { Restaurant } from "@/lib/types";
import { getRestaurantStatusLabel } from "@/lib/constants";
import { CustomerAuthButton } from "./customer-auth-button";
import { RestaurantInfoDrawer } from "./restaurant-info-drawer";

export function RestaurantHeader({
  restaurant,
}: {
  restaurant: Restaurant;
}) {
  const [infoOpen, setInfoOpen] = useState(false);
  const status = getRestaurantStatusLabel(restaurant.opening_hours);
  const isOpen = status.isOpen && restaurant.is_accepting_orders;
  const statusLabel = restaurant.is_accepting_orders ? status.label : "Fermé";

  return (
    <>
      <header className="border-b border-[#E6D9C2] bg-[#F5EBDB] px-4 py-3">
        {/* Row 1: logo + name (opens info drawer) + login button */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setInfoOpen(true)}
            aria-label={`Voir la fiche de ${restaurant.name}`}
            className="-mx-1 -my-0.5 flex min-w-0 flex-1 items-center gap-3 rounded-xl px-1 py-0.5 text-left transition-colors active:bg-[#E6D9C2]/60"
          >
            {restaurant.logo_url ? (
              <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-[13px] border border-[#E6D9C2] bg-[#fdf9f3]">
                <Image
                  src={restaurant.logo_url}
                  alt={`${restaurant.name} logo`}
                  fill
                  className="object-cover"
                  sizes="44px"
                />
              </div>
            ) : (
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] border border-[#E6D9C2] bg-[#fdf9f3] text-base font-bold text-[#1c1410]">
                {restaurant.name.charAt(0).toUpperCase()}
              </div>
            )}
            <h1 className="flex min-w-0 flex-1 items-center gap-1.5 text-[17px] font-extrabold leading-tight tracking-[-0.025em] text-[#1c1410]">
              <span className="truncate">{restaurant.name}</span>
              <Info className="h-3.5 w-3.5 shrink-0 text-[#68625e]" />
            </h1>
          </button>
          <CustomerAuthButton publicId={restaurant.public_id} />
        </div>

        {/* Row 2: status + description */}
        <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <span
            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] ${
              isOpen
                ? "bg-[#d8efd9] text-[#00873a]"
                : "bg-[#fbdadd] text-[#bf000f]"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isOpen ? "bg-[#00873a]" : "bg-[#bf000f]"
              }`}
            />
            {statusLabel}
          </span>
          {restaurant.description && (
            <p className="min-w-0 flex-1 truncate text-[11px] tracking-[0.03em] text-[#68625e]">
              · {restaurant.description}
            </p>
          )}
        </div>
      </header>
      <RestaurantInfoDrawer
        restaurant={restaurant}
        open={infoOpen}
        onOpenChange={setInfoOpen}
      />
    </>
  );
}
