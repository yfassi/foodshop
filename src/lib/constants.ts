import type { DeliveryStatus, OrderStatus, OrderType } from "./types";

export const ORDER_STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; color: string; bgClass: string; nextStatus?: OrderStatus; nextLabel?: string }
> = {
  new: {
    label: "Nouvelle",
    color: "text-orange-700",
    bgClass: "bg-orange-50 border border-orange-200",
    nextStatus: "preparing",
    nextLabel: "Commencer",
  },
  preparing: {
    label: "En préparation",
    color: "text-amber-700",
    bgClass: "bg-amber-50 border border-amber-200",
    nextStatus: "ready",
    nextLabel: "Prêt !",
  },
  ready: {
    label: "Prête",
    color: "text-green-700",
    bgClass: "bg-green-50 border border-green-200",
    nextStatus: "done",
    nextLabel: "Récupéré",
  },
  done: {
    label: "Terminée",
    color: "text-gray-500",
    bgClass: "bg-gray-50 border border-gray-200",
  },
  cancelled: {
    label: "Annulée",
    color: "text-gray-500",
    bgClass: "bg-gray-50 border border-gray-200",
  },
};

export const DELIVERY_STATUS_CONFIG: Record<
  DeliveryStatus,
  { label: string; color: string; bgClass: string }
> = {
  pending: {
    label: "À assigner",
    color: "text-orange-700",
    bgClass: "bg-orange-50 border border-orange-200",
  },
  assigned: {
    label: "Livreur assigné",
    color: "text-blue-700",
    bgClass: "bg-blue-50 border border-blue-200",
  },
  picked_up: {
    label: "En route",
    color: "text-amber-700",
    bgClass: "bg-amber-50 border border-amber-200",
  },
  delivered: {
    label: "Livrée",
    color: "text-green-700",
    bgClass: "bg-green-50 border border-green-200",
  },
  failed: {
    label: "Échec",
    color: "text-red-700",
    bgClass: "bg-red-50 border border-red-200",
  },
};

export const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  dine_in: "Sur place",
  takeaway: "À emporter",
  delivery: "Livraison",
};

/** Normalize opening_hours entry: handles both old {open,close} and new [{open,close}] formats */
export function normalizeHoursEntry(
  entry: unknown
): { open: string; close: string }[] | null {
  if (!entry) return null;
  if (Array.isArray(entry)) return entry as { open: string; close: string }[];
  if (typeof entry === "object" && "open" in (entry as Record<string, unknown>)) {
    return [entry as { open: string; close: string }];
  }
  return null;
}

export const DAYS_FR: Record<string, string> = {
  monday: "Lundi",
  tuesday: "Mardi",
  wednesday: "Mercredi",
  thursday: "Jeudi",
  friday: "Vendredi",
  saturday: "Samedi",
  sunday: "Dimanche",
};

export const DAYS_FR_SHORT: Record<string, string> = {
  monday: "Lun",
  tuesday: "Mar",
  wednesday: "Mer",
  thursday: "Jeu",
  friday: "Ven",
  saturday: "Sam",
  sunday: "Dim",
};

/** Generate time options from 00:00 to 23:45 in 15-minute increments */
export function generateTimeOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 15, 30, 45]) {
      const value = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
      options.push({ value, label: value });
    }
  }
  return options;
}

export const TIME_OPTIONS = generateTimeOptions();

const RESTAURANT_TIMEZONE = "Europe/Paris";

/** Current day-of-week (0=Sun..6=Sat) and minutes-since-midnight in restaurant timezone. */
function getNowInRestaurantTz(): { day: number; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: RESTAURANT_TIMEZONE,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const weekdayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "Sun";
  const hourStr = parts.find((p) => p.type === "hour")?.value ?? "0";
  const minuteStr = parts.find((p) => p.type === "minute")?.value ?? "0";
  // Intl can return "24" for hour at midnight in some runtimes
  const hour = Number(hourStr) % 24;
  const minute = Number(minuteStr);
  return { day: weekdayMap[weekday] ?? 0, minutes: hour * 60 + minute };
}

/** Get the current closing time if restaurant is open, or next opening info if closed */
export function getRestaurantStatusLabel(
  openingHours: Record<string, unknown> | null | undefined
): { isOpen: boolean; label: string } {
  if (!openingHours) return { isOpen: true, label: "Ouvert" };

  const dayKeys = [
    "sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday",
  ];
  const { day: currentDay, minutes: currentMinutes } = getNowInRestaurantTz();
  const todayKey = dayKeys[currentDay];

  // Check if currently open & get closing time
  const todayRanges = normalizeHoursEntry(openingHours[todayKey]);
  if (todayRanges) {
    for (const range of todayRanges) {
      const [openH, openM] = range.open.split(":").map(Number);
      const [closeH, closeM] = range.close.split(":").map(Number);
      const openMin = openH * 60 + openM;
      const closeMin = closeH * 60 + closeM;
      if (currentMinutes >= openMin && currentMinutes < closeMin) {
        return { isOpen: true, label: `Ouvert · jusqu'à ${range.close}` };
      }
    }
    // Check if there's a later slot today
    for (const range of todayRanges) {
      const [openH, openM] = range.open.split(":").map(Number);
      const openMin = openH * 60 + openM;
      if (openMin > currentMinutes) {
        return { isOpen: false, label: `Fermé · réouv. ${range.open}` };
      }
    }
  }

  // Find next opening day
  for (let offset = 1; offset <= 7; offset++) {
    const dayIdx = (currentDay + offset) % 7;
    const dayKey = dayKeys[dayIdx];
    const ranges = normalizeHoursEntry(openingHours[dayKey]);
    if (ranges && ranges.length > 0) {
      const dayLabel = offset === 1 ? "demain" : DAYS_FR[dayKey].toLowerCase();
      return { isOpen: false, label: `Fermé · réouv. ${dayLabel}` };
    }
  }

  return { isOpen: false, label: "Fermé" };
}

/** Check if the restaurant is currently open based on opening_hours */
export function isCurrentlyOpen(
  openingHours: Record<string, unknown> | null | undefined
): boolean {
  if (!openingHours) return true; // No hours configured → always open

  const days = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  const { day, minutes: currentMinutes } = getNowInRestaurantTz();
  const todayKey = days[day];
  const ranges = normalizeHoursEntry(openingHours[todayKey]);

  if (!ranges || ranges.length === 0) return false; // No hours today → closed

  return ranges.some((range) => {
    const [openH, openM] = range.open.split(":").map(Number);
    const [closeH, closeM] = range.close.split(":").map(Number);
    const openMin = openH * 60 + openM;
    const closeMin = closeH * 60 + closeM;
    return currentMinutes >= openMin && currentMinutes < closeMin;
  });
}
