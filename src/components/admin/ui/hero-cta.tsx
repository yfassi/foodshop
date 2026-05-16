import { cn } from "@/lib/utils";

export function HeroCta({
  icon,
  title,
  subtitle,
  primary,
  utilities,
  className,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  primary: React.ReactNode;
  utilities?: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-2xl border border-tint p-5",
        "bg-[linear-gradient(135deg,var(--tint-bg-2),var(--tint-bg))]",
        className
      )}
    >
      <div className="flex items-center gap-4">
        <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[14px] bg-brand-accent text-[color:var(--brand-accent-fg)]">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold leading-snug text-foreground">{title}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {primary}
          {utilities && (
            <>
              <div className="h-9 w-px bg-border-2-tk" aria-hidden />
              <div className="flex items-center gap-1.5">{utilities}</div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
