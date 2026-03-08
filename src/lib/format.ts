export function formatPrice(cents: number): string {
  const euros = (cents / 100).toFixed(2).replace(".", ",");
  return `${euros} \u20AC`;
}

export function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export type Period = "today" | "7days" | "30days";

export function getStartDate(period: Period): Date {
  const d = new Date();
  if (period === "today") {
    d.setHours(0, 0, 0, 0);
  } else if (period === "7days") {
    d.setDate(d.getDate() - 6);
    d.setHours(0, 0, 0, 0);
  } else {
    d.setDate(d.getDate() - 29);
    d.setHours(0, 0, 0, 0);
  }
  return d;
}
