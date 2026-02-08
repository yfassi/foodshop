import type { OrderStatus } from "./types";

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
    label: "En preparation",
    color: "text-amber-700",
    bgClass: "bg-amber-50 border border-amber-200",
    nextStatus: "ready",
    nextLabel: "Pret !",
  },
  ready: {
    label: "Prete",
    color: "text-green-700",
    bgClass: "bg-green-50 border border-green-200",
    nextStatus: "done",
    nextLabel: "Recupere",
  },
  done: {
    label: "Terminee",
    color: "text-gray-500",
    bgClass: "bg-gray-50 border border-gray-200",
  },
  cancelled: {
    label: "Annulee",
    color: "text-gray-500",
    bgClass: "bg-gray-50 border border-gray-200",
  },
};

export function generatePickupTimeSlots(
  openingTime: string,
  closingTime: string
): string[] {
  const now = new Date();
  const slots: string[] = [];

  // Parse opening/closing times
  const [closeH, closeM] = closingTime.split(":").map(Number);

  // Start from now + 15 minutes, rounded to next 15-min slot
  const start = new Date(now.getTime() + 15 * 60 * 1000);
  start.setMinutes(Math.ceil(start.getMinutes() / 15) * 15, 0, 0);

  const end = new Date(now);
  end.setHours(closeH, closeM, 0, 0);

  // If closing time is before current time (next day scenario), return empty
  if (end <= now) return [];

  const current = new Date(start);
  while (current <= end) {
    const h = current.getHours().toString().padStart(2, "0");
    const m = current.getMinutes().toString().padStart(2, "0");
    slots.push(`${h}:${m}`);
    current.setMinutes(current.getMinutes() + 15);
  }

  return slots;
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
