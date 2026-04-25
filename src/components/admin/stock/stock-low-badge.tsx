import { AlertTriangle } from "lucide-react";

export function StockLowBadge({ size = "sm" }: { size?: "sm" | "md" }) {
  return (
    <span
      className={
        size === "sm"
          ? "inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-amber-200"
          : "inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-200"
      }
    >
      <AlertTriangle className={size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3"} />
      Bas niveau
    </span>
  );
}
