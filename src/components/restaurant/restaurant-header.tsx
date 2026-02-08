"use client";

import { useState } from "react";
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
    <header className="border-b border-border bg-card px-4 py-5">
      <div className="flex items-start justify-between">
        <h1 className="text-2xl font-bold tracking-tight">
          {restaurant.name}
        </h1>
        <CustomerAuthButton slug={restaurant.slug} />
      </div>
      {todayHours && (
        <div className="mt-1.5">
          <button
            onClick={() => setShowHours(!showHours)}
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
