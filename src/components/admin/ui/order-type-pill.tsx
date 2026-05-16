import { cn } from "@/lib/utils";

import type { OrderType } from "@/lib/types";

const LABELS: Record<OrderType, string> = {
  dine_in: "Sur place",
  takeaway: "À emporter",
  delivery: "Livraison",
};

const TONE: Record<OrderType, string> = {
  dine_in: "bg-bg-3 text-foreground border-border-2-tk",
  takeaway: "status-info",
  delivery: "status-warn",
};

export function OrderTypePill({ type, className }: { type: OrderType; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-transparent px-2 py-0.5 text-[11px] font-medium",
        TONE[type],
        className
      )}
    >
      {LABELS[type]}
    </span>
  );
}
