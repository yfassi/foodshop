import { cn } from "@/lib/utils";

export function ElapsedBadge({ minutes, className }: { minutes: number; className?: string }) {
  const tone =
    minutes >= 15 ? "status-danger" : minutes >= 8 ? "status-warn" : "status-success";
  const label = minutes < 1 ? "<1 min" : `${Math.round(minutes)} min`;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium tabular",
        tone,
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {label}
    </span>
  );
}
