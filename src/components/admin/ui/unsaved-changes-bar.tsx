"use client";

import { cn } from "@/lib/utils";

export function UnsavedChangesBar({
  count,
  onCancel,
  onSave,
  saving = false,
}: {
  count: number;
  onCancel: () => void;
  onSave: () => void;
  saving?: boolean;
}) {
  if (count === 0) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
      <div
        className={cn(
          "pointer-events-auto flex items-center gap-3 rounded-2xl border px-4 py-2.5 shadow-2xl",
          "bg-foreground text-background border-foreground/10"
        )}
      >
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
            disabled={saving}
            className="rounded-lg bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:bg-background/90 disabled:opacity-50"
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}
