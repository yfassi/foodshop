"use client";

import { useState } from "react";
import Image from "next/image";
import { Clock, ChevronDown } from "lucide-react";
import type { Restaurant } from "@/lib/types";
import { DAYS_FR, normalizeHoursEntry } from "@/lib/constants";
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

  return (
    <header className="border-b border-border bg-card px-4 py-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {restaurant.logo_url ? (
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl">
              <Image
                src={restaurant.logo_url}
                alt={`${restaurant.name} logo`}
                fill
                className="object-cover"
                sizes="40px"
              />
            </div>
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground text-sm font-bold">
              {restaurant.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-lg font-bold tracking-tight">
              {restaurant.name}
            </h1>
            {restaurant.is_accepting_orders && (
              <div className="flex items-center gap-1 mt-0.5">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="text-[10px] font-medium text-emerald-600">Ouvert</span>
              </div>
            )}
          </div>
        </div>
        <CustomerAuthButton slug={restaurant.slug} />
      </div>
      {todayHours && (
        <div className="mt-1.5">
          <button
            onClick={() => setShowHours(!showHours)}
            aria-expanded={showHours}
            className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <span>Voir plus</span>
            <ChevronDown
              className={`h-3 w-3 transition-transform ${showHours ? "rotate-180" : ""}`}
            />
          </button>
          {showHours && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              <span>
                {todayName} : {todayHours}
              </span>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
