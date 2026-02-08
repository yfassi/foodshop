import { MapPin, Phone, Clock } from "lucide-react";
import type { Restaurant } from "@/lib/types";
import { DAYS_FR } from "@/lib/constants";

function getCurrentDayHours(restaurant: Restaurant) {
  const days = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  const today = days[new Date().getDay()];
  const hours = restaurant.opening_hours?.[today];
  if (!hours) return null;
  return `${hours.open} - ${hours.close}`;
}

export function RestaurantHeader({
  restaurant,
}: {
  restaurant: Restaurant;
}) {
  const todayHours = getCurrentDayHours(restaurant);
  const todayName =
    DAYS_FR[
      [
        "sunday",
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
      ][new Date().getDay()]
    ];

  return (
    <header className="border-b border-border bg-card px-4 py-5">
      <h1 className="text-2xl font-bold tracking-tight">
        {restaurant.name}
      </h1>
      {restaurant.description && (
        <p className="mt-1 text-sm text-muted-foreground">
          {restaurant.description}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
        {restaurant.address && (
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span>{restaurant.address}</span>
          </div>
        )}
        {restaurant.phone && (
          <div className="flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5 shrink-0" />
            <span>{restaurant.phone}</span>
          </div>
        )}
        {todayHours && (
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span>
              {todayName} : {todayHours}
            </span>
          </div>
        )}
      </div>
    </header>
  );
}
