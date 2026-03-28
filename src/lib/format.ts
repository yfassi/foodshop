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

export type Period = "today" | "yesterday" | "this_week" | "last_week" | "this_month" | "last_month" | "this_quarter" | "this_year" | "7days" | "30days" | "90days" | "custom";

export function getDateRange(period: Period): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date();
  const end = new Date();

  // End is always end of today by default
  end.setHours(23, 59, 59, 999);

  switch (period) {
    case "today":
      start.setHours(0, 0, 0, 0);
      break;
    case "yesterday":
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(end.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      break;
    case "this_week": {
      const day = now.getDay();
      const diff = day === 0 ? 6 : day - 1; // Monday = start of week
      start.setDate(now.getDate() - diff);
      start.setHours(0, 0, 0, 0);
      break;
    }
    case "last_week": {
      const day = now.getDay();
      const diff = day === 0 ? 6 : day - 1;
      start.setDate(now.getDate() - diff - 7);
      start.setHours(0, 0, 0, 0);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      break;
    }
    case "this_month":
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      break;
    case "last_month":
      start.setMonth(start.getMonth() - 1, 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(0); // Last day of previous month
      end.setHours(23, 59, 59, 999);
      break;
    case "this_quarter": {
      const quarter = Math.floor(now.getMonth() / 3);
      start.setMonth(quarter * 3, 1);
      start.setHours(0, 0, 0, 0);
      break;
    }
    case "this_year":
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      break;
    case "7days":
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      break;
    case "30days":
      start.setDate(start.getDate() - 29);
      start.setHours(0, 0, 0, 0);
      break;
    case "90days":
      start.setDate(start.getDate() - 89);
      start.setHours(0, 0, 0, 0);
      break;
    case "custom":
      // Custom dates are handled externally
      start.setHours(0, 0, 0, 0);
      break;
  }

  return { start, end };
}

/** @deprecated Use getDateRange instead */
export function getStartDate(period: Period): Date {
  return getDateRange(period).start;
}
