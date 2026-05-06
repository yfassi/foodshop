"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Loader2,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";
import type { Ingredient, StockMovement, StockMovementReason } from "@/lib/types";

const REASON_LABEL: Record<StockMovementReason, string> = {
  scan_in: "Réception",
  order_consumption: "Commande",
  manual_adjust: "Ajustement",
  loss: "Perte",
  opening: "Init.",
};

const ADJUST_REASONS: StockMovementReason[] = ["manual_adjust", "loss"];

export function MovementsClient({
  slug,
  restaurantId,
}: {
  slug: string;
  restaurantId: string;
}) {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    ingredient_id: "",
    delta: "",
    reason: "loss" as StockMovementReason,
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [a, b] = await Promise.all([
      fetch(`/api/admin/stock/movements?restaurant_id=${restaurantId}`).then((r) =>
        r.json()
      ),
      fetch(`/api/admin/stock/ingredients?restaurant_id=${restaurantId}`).then((r) =>
        r.json()
      ),
    ]);
    setMovements(a.movements || []);
    setIngredients(b.ingredients || []);
    setLoading(false);
  }, [restaurantId]);

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  const ingredientById = useMemo(() => {
    const m = new Map<string, Ingredient>();
    for (const i of ingredients) m.set(i.id, i);
    return m;
  }, [ingredients]);

  const submit = async () => {
    const delta = parseFloat(form.delta.replace(",", "."));
    if (!form.ingredient_id || !Number.isFinite(delta) || delta === 0) {
      toast.error("Champs invalides");
      return;
    }
    const signedDelta = form.reason === "loss" ? -Math.abs(delta) : delta;
    setSaving(true);
    const res = await fetch("/api/admin/stock/movements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        restaurant_id: restaurantId,
        ingredient_id: form.ingredient_id,
        delta: signedDelta,
        reason: form.reason,
        notes: form.notes,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error || "Erreur");
      return;
    }
    toast.success("Mouvement enregistré");
    setOpen(false);
    setForm({ ingredient_id: "", delta: "", reason: "loss", notes: "" });
    load();
  };

  return (
    <div className="space-y-6 px-4 py-6 md:px-8">
      <Link
        href={`/admin/${slug}/stock`}
        className="-ml-1 inline-flex h-9 items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">
            ★ Journal
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">Mouvements</h1>
        </div>
        <Button onClick={() => setOpen(true)} variant="outline" className="rounded-xl">
          <TriangleAlert className="mr-2 h-4 w-4" />
          Déclarer une perte / un ajustement
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="px-5 py-10 text-center text-sm text-muted-foreground">
              Chargement…
            </div>
          ) : movements.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-muted-foreground">
              Aucun mouvement.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {movements.map((m) => {
                const ing = ingredientById.get(m.ingredient_id);
                const isNeg = m.delta < 0;
                return (
                  <li key={m.id} className="grid grid-cols-12 gap-3 px-5 py-3">
                    <div className="col-span-3 text-[11px] tabular-nums text-muted-foreground">
                      {new Date(m.created_at).toLocaleString("fr-FR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                    <div className="col-span-5 truncate text-sm font-medium">
                      {ing?.name || "—"}
                    </div>
                    <div
                      className={`col-span-2 inline-flex items-center gap-1 text-sm font-mono tabular-nums ${
                        isNeg ? "text-destructive" : "text-emerald-700"
                      }`}
                    >
                      {isNeg ? (
                        <ArrowDown className="h-3 w-3" />
                      ) : (
                        <ArrowUp className="h-3 w-3" />
                      )}
                      {m.delta > 0 ? "+" : ""}
                      {m.delta} {ing?.unit || ""}
                    </div>
                    <div className="col-span-2 text-right text-[11px] uppercase tracking-wide text-muted-foreground">
                      {REASON_LABEL[m.reason]}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Déclarer un mouvement</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 px-4 py-2">
            <div>
              <Label className="text-sm font-medium">Ingrédient</Label>
              <select
                className="mt-1.5 h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.ingredient_id}
                onChange={(e) => setForm({ ...form, ingredient_id: e.target.value })}
              >
                <option value="">— Choisir —</option>
                {ingredients.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name} ({i.unit})
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-medium">Type</Label>
                <select
                  className="mt-1.5 h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.reason}
                  onChange={(e) =>
                    setForm({ ...form, reason: e.target.value as StockMovementReason })
                  }
                >
                  {ADJUST_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {REASON_LABEL[r]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-sm font-medium">
                  Quantité {form.reason === "loss" ? "perdue" : "(±)"}
                </Label>
                <Input
                  className="mt-1.5 h-11"
                  inputMode="decimal"
                  value={form.delta}
                  onChange={(e) => setForm({ ...form, delta: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">Notes</Label>
              <Input
                className="mt-1.5 h-11"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Ex. casse, péremption…"
              />
            </div>
          </div>
          <SheetFooter>
            <Button onClick={submit} disabled={saving} className="h-11 w-full rounded-xl">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enregistrer"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
