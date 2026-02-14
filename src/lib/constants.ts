import type { OrderStatus } from "./types";
import type { LucideIcon } from "lucide-react";
import {
  UtensilsCrossed,
  Hamburger,
  Pizza,
  Sandwich,
  Salad,
  Soup,
  Flame,
  Drumstick,
  ChefHat,
  Coffee,
  Fish,
  Croissant,
} from "lucide-react";

export interface RestaurantTypeOption {
  value: string;
  label: string;
  icon: LucideIcon;
}

export const RESTAURANT_TYPES: RestaurantTypeOption[] = [
  { value: "traditionnel", label: "Traditionnel", icon: UtensilsCrossed },
  { value: "fast_food", label: "Fast food", icon: Hamburger },
  { value: "pizzeria", label: "Pizzeria", icon: Pizza },
  { value: "snack", label: "Snack", icon: Sandwich },
  { value: "healthy", label: "Healthy", icon: Salad },
  { value: "asiatique", label: "Asiatique", icon: Soup },
  { value: "grill", label: "Grill", icon: Flame },
  { value: "poulet", label: "Poulet / Broche", icon: Drumstick },
  { value: "gastronomique", label: "Gastronomique", icon: ChefHat },
  { value: "cafe", label: "Café / Salon de thé", icon: Coffee },
  { value: "poisson", label: "Poissonnerie", icon: Fish },
  { value: "boulangerie", label: "Boulangerie", icon: Croissant },
];

export const ORDER_STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; color: string; bgClass: string; nextStatus?: OrderStatus; nextLabel?: string }
> = {
  new: {
    label: "Nouvelle",
    color: "text-red-700",
    bgClass: "bg-red-50 border border-red-200",
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

export function generatePickupTimeSlots(
  ranges: { open: string; close: string }[]
): string[] {
  const now = new Date();
  const slots: string[] = [];

  for (const range of ranges) {
    const [openH, openM] = range.open.split(":").map(Number);
    const [closeH, closeM] = range.close.split(":").map(Number);

    const rangeStart = new Date(now);
    rangeStart.setHours(openH, openM, 0, 0);

    const end = new Date(now);
    end.setHours(closeH, closeM, 0, 0);

    if (end <= now) continue;

    // Start from now + 15 minutes, rounded to next 15-min slot
    const earliest = new Date(now.getTime() + 15 * 60 * 1000);
    earliest.setMinutes(Math.ceil(earliest.getMinutes() / 15) * 15, 0, 0);

    const start = earliest > rangeStart ? earliest : rangeStart;

    const current = new Date(start);
    while (current <= end) {
      const h = current.getHours().toString().padStart(2, "0");
      const m = current.getMinutes().toString().padStart(2, "0");
      slots.push(`${h}:${m}`);
      current.setMinutes(current.getMinutes() + 15);
    }
  }

  return slots;
}

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
  const now = new Date();
  const todayKey = days[now.getDay()];
  const ranges = normalizeHoursEntry(openingHours[todayKey]);

  if (!ranges || ranges.length === 0) return false; // No hours today → closed

  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  return ranges.some((range) => {
    const [openH, openM] = range.open.split(":").map(Number);
    const [closeH, closeM] = range.close.split(":").map(Number);
    const openMin = openH * 60 + openM;
    const closeMin = closeH * 60 + closeM;
    return currentMinutes >= openMin && currentMinutes < closeMin;
  });
}
