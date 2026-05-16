import { cn } from "@/lib/utils";

export function StatCell({
  label,
  value,
  hint,
  accent = false,
  className,
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-4",
        accent ? "border-tint bg-tint" : "border-2-tk",
        className
      )}
    >
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 font-mono text-2xl font-semibold tabular text-foreground">
        {value}
      </div>
      {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function StatStrip({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5", className)}>
      {children}
    </div>
  );
}
