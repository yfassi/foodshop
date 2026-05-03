import type { ComponentType, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  /** Optional uppercase eyebrow shown above the title (e.g. "Service · aujourd'hui"). */
  kicker?: ReactNode;
  /** Optional icon shown to the left of the title in a soft rounded square. */
  icon?: ComponentType<{ className?: string }>;
  /** Main page title. */
  title: ReactNode;
  /** Optional one-line description shown under the title. */
  subtitle?: ReactNode;
  /** Right-aligned actions slot (buttons, dropdowns, badges…). */
  actions?: ReactNode;
  /** Optional secondary row rendered below the main row (filters, view toggle…). */
  children?: ReactNode;
  className?: string;
};

export function AdminPageHeader({
  kicker,
  icon: Icon,
  title,
  subtitle,
  actions,
  children,
  className,
}: Props) {
  return (
    <header
      className={cn(
        "mb-6 flex flex-col gap-3 border-b border-border/70 pb-5",
        className,
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          {Icon && (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <Icon className="h-5 w-5" />
            </div>
          )}
          <div className="min-w-0">
            {kicker && (
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {kicker}
              </p>
            )}
            <h1 className="truncate text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>

        {actions && (
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            {actions}
          </div>
        )}
      </div>

      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </header>
  );
}
