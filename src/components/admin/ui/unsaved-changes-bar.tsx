"use client";

import { cn } from "@/lib/utils";

// variant="floating" (défaut) : barre fixed bottom au-dessus du viewport, utile
// pour pages pleine page (réglages).
// variant="sticky" : ancrée dans son parent flex column, utile pour un éditeur
// dans un pane (Articles 3-pane).
export function UnsavedChangesBar({
  count,
  onCancel,
  onSave,
  saving = false,
  disabled = false,
  variant = "floating",
}: {
  count: number;
  onCancel: () => void;
  onSave: () => void;
  saving?: boolean;
  disabled?: boolean;
  variant?: "floating" | "sticky";
}) {
  if (count === 0) return null;
  const wrapperClass =
    variant === "sticky"
      ? "sticky bottom-0 z-30 border-t border-2-tk bg-background/95 px-4 py-3 backdrop-blur md:px-6"
      : "pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4";
  const innerClass =
    variant === "sticky"
      ? "flex flex-wrap items-center gap-3 rounded-xl border bg-foreground px-4 py-2.5 text-background border-foreground/10"
      : "pointer-events-auto flex items-center gap-3 rounded-2xl border px-4 py-2.5 shadow-2xl bg-foreground text-background border-foreground/10";
  return (
    <div className={wrapperClass}>
      <div className={cn(innerClass)}>
        <span className="inline-flex h-2 w-2 rounded-full bg-orange-400" aria-hidden />
        <span className="text-sm font-medium tabular">
          {count} modification{count > 1 ? "s" : ""} non enregistrée{count > 1 ? "s" : ""}
        </span>
        <div className="ml-2 flex items-center gap-1">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="rounded-lg px-3 py-1.5 text-sm text-background/80 hover:bg-background/10 disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving || disabled}
            className="rounded-lg bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:bg-background/90 disabled:opacity-50"
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}
