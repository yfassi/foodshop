"use client";

import { useState, useEffect } from "react";
import { isCurrentlyOpen, normalizeHoursEntry, DAYS_FR } from "@/lib/constants";
import { Clock } from "lucide-react";

export function ClosedBanner({
  isAcceptingOrders,
  openingHours,
}: {
  isAcceptingOrders: boolean;
  openingHours: Record<string, unknown> | null;
}) {
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    const check = () => setIsOpen(isCurrentlyOpen(openingHours));
    check();
    // Re-check every minute
    const interval = setInterval(check, 60_000);
    return () => clearInterval(interval);
  }, [openingHours]);

  // Manual override: owner turned off orders
  if (!isAcceptingOrders) {
    return (
      <div className="bg-orange-50 px-4 py-3 text-center text-sm font-medium text-orange-600">
        Le restaurant ne prend plus de commandes pour le moment.
      </div>
    );
  }

  // Outside opening hours
  if (!isOpen) {
    // Find next opening time
    const nextOpening = getNextOpening(openingHours);

    return (
      <div className="bg-amber-50 px-4 py-3 text-center text-sm font-medium text-amber-700">
        <div className="flex items-center justify-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          <span>
            Le restaurant est actuellement fermé.
            {nextOpening && (
              <span className="ml-1">
                Prochaine ouverture : {nextOpening}
              </span>
            )}
          </span>
        </div>
      </div>
    );
  }

  return null;
}

function getNextOpening(
  openingHours: Record<string, unknown> | null
): string | null {
  if (!openingHours) return null;

  const dayKeys = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  const now = new Date();
  const currentDay = now.getDay();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // Check remaining slots today
  const todayKey = dayKeys[currentDay];
  const todayRanges = normalizeHoursEntry(openingHours[todayKey]);
  if (todayRanges) {
    for (const range of todayRanges) {
      const [openH, openM] = range.open.split(":").map(Number);
      const openMin = openH * 60 + openM;
      if (openMin > currentMinutes) {
        return `aujourd'hui à ${range.open}`;
      }
    }
  }

  // Check upcoming days
  for (let offset = 1; offset <= 7; offset++) {
    const dayIdx = (currentDay + offset) % 7;
    const dayKey = dayKeys[dayIdx];
    const ranges = normalizeHoursEntry(openingHours[dayKey]);
    if (ranges && ranges.length > 0) {
      const dayLabel =
        offset === 1
          ? "demain"
          : DAYS_FR[dayKey];
      return `${dayLabel} à ${ranges[0].open}`;
    }
  }

  return null;
}
