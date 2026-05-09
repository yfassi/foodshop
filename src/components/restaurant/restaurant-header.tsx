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
    <header className="border-b border-border bg-card px-4 py-3.5">
      <div className="flex items-center gap-3">
        {restaurant.logo_url ? (
          <div className="relative h-[46px] w-[46px] shrink-0 overflow-hidden rounded-[13px]">
            <Image
              src={restaurant.logo_url}
              alt={`${restaurant.name} logo`}
              fill
              className="object-cover"
              sizes="46px"
            />
          </div>
        ) : (
          <div className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[13px] bg-muted text-base font-bold text-foreground">
            {restaurant.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[17px] font-extrabold tracking-tight">
            {restaurant.name}
          </h1>
          {restaurant.description && (
            <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
              {restaurant.description}
            </p>
          )}
        </div>
        <span
          className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            isOpen
              ? "bg-success-soft text-success"
              : "bg-destructive/10 text-destructive"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              isOpen ? "bg-success" : "bg-destructive"
            }`}
          />
          {statusLabel}
        </span>
        <div className="ml-1">
          <CustomerAuthButton publicId={restaurant.public_id} />
        </div>
      </div>
      {todayHours && (
        <div className="mt-2">
          <button
            onClick={() => setShowHours(!showHours)}
            aria-expanded={showHours}
            className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <Clock className="h-3 w-3" />
            <span>Horaires du jour</span>
            <ChevronDown
              className={`h-3 w-3 transition-transform ${showHours ? "rotate-180" : ""}`}
            />
          </button>
          {showHours && (
            <div className="mt-1.5 text-[11px] text-muted-foreground">
              {todayName} : <span className="font-mono font-semibold text-foreground">{todayHours}</span>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
