"use client";

import { useState } from "react";
import Image from "next/image";
import { Clock, ChevronDown } from "lucide-react";
import type { Restaurant } from "@/lib/types";
import { DAYS_FR, getRestaurantStatusLabel, normalizeHoursEntry } from "@/lib/constants";
import { CustomerAuthButton } from "./customer-auth-button";

function getTodayKey() {
  const days = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  return days[new Date().getDay()];
}

function getTodayHours(restaurant: Restaurant) {
  const today = getTodayKey();
  const ranges = normalizeHoursEntry(restaurant.opening_hours?.[today]);
  if (!ranges || ranges.length === 0) return null;
  return ranges.map((r) => `${r.open} - ${r.close}`).join(" / ");
}

export function RestaurantHeader({
  restaurant,
}: {
  restaurant: Restaurant;
}) {
  const [showHours, setShowHours] = useState(false);
  const todayHours = getTodayHours(restaurant);
  const todayName = DAYS_FR[getTodayKey()];
  const status = getRestaurantStatusLabel(restaurant.opening_hours);
  const isOpen = status.isOpen && restaurant.is_accepting_orders;
  const statusLabel = restaurant.is_accepting_orders ? status.label : "Fermé";

  return (
    <header className="border-b border-[#E6D9C2] bg-[#F5EBDB] px-4 py-3">
      {/* Row 1: logo + name + login button (always visible) */}
      <div className="flex items-center gap-3">
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
        <h1 className="min-w-0 flex-1 truncate text-[17px] font-extrabold leading-tight tracking-[-0.025em] text-[#1c1410]">
          {restaurant.name}
        </h1>
        <CustomerAuthButton slug={restaurant.slug} />
      </div>

      {/* Row 2: status + hours toggle + description */}
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
        {todayHours && (
          <button
            onClick={() => setShowHours(!showHours)}
            aria-expanded={showHours}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-[#68625e] transition-colors hover:text-[#1c1410]"
          >
            <Clock className="h-3 w-3" />
            <span className="font-mono">{todayHours}</span>
            <ChevronDown
              className={`h-3 w-3 transition-transform ${showHours ? "rotate-180" : ""}`}
            />
          </button>
        )}
        {restaurant.description && (
          <p className="min-w-0 flex-1 truncate text-[11px] tracking-[0.03em] text-[#68625e]">
            · {restaurant.description}
          </p>
        )}
      </div>

      {showHours && todayHours && (
        <div className="mt-1.5 text-[11px] text-[#68625e]">
          {todayName} : <span className="font-mono font-semibold text-[#1c1410]">{todayHours}</span>
        </div>
      )}
    </header>
  );
}
