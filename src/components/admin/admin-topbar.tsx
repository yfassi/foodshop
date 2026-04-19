"use client";

import { Bell, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export function AdminTopbar({
  className,
  cta,
  hasUnread = false,
}: {
  className?: string;
  cta?: React.ReactNode;
  hasUnread?: boolean;
}) {
  return (
    <div
      className={cn(
        "sticky top-0 z-30 hidden md:flex items-center gap-4 border-b border-border bg-background/85 px-6 py-2.5 backdrop-blur-sm",
        className
      )}
    >
      <label className="relative flex-1 max-w-[420px]">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          placeholder="Rechercher une commande, un produit…"
          className="h-[34px] w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring"
        />
      </label>

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          aria-label="Notifications"
          className="relative flex h-[34px] w-[34px] items-center justify-center rounded-lg border border-border bg-background text-foreground transition-colors hover:bg-accent"
        >
          <Bell className="h-3.5 w-3.5" />
          {hasUnread && (
            <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-destructive ring-2 ring-background" />
          )}
        </button>
        {cta}
      </div>
    </div>
  );
}
