"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ArrowLeft, Pencil, Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Ingredient, IngredientUnit, Supplier } from "@/lib/types";

const UNITS: { value: IngredientUnit; label: string }[] = [
  { value: "kg", label: "Kilogrammes (kg)" },
  { value: "g", label: "Grammes (g)" },
  { value: "l", label: "Litres (l)" },
  { value: "ml", label: "Millilitres (ml)" },
  { value: "piece", label: "Pièces (u.)" },
];

type FormState = {
  id?: string;
  name: string;
  category: string;
  unit: IngredientUnit;
  current_qty: string;
  low_threshold: string;
  cost_per_unit_cents: string;
  supplier_id: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  category: "",
  unit: "piece",
  current_qty: "0",
  low_threshold: "0",
  cost_per_unit_cents: "",
  supplier_id: "",
};

export function IngredientsClient({
  publicId,
  restaurantId,
}: {
  publicId: string;
  restaurantId: string;
}) {
  const [items, setItems] = useState<Ingredient[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [a, b] = await Promise.all([
      fetch(`/api/admin/stock/ingredients?restaurant_id=${restaurantId}`).then((r) =>
        r.json()
      ),
      fetch(`/api/admin/stock/suppliers?restaurant_id=${restaurantId}`).then((r) => r.json()),
    ]);
    setItems(a.ingredients || []);
    setSuppliers(b.suppliers || []);
    setLoading(false);
  }, [restaurantId]);

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setOpen(true);
  };

  const openEdit = (ing: Ingredient) => {
    setForm({
      id: ing.id,
      name: ing.name,
      category: ing.category || "",
      unit: ing.unit,
      current_qty: String(ing.current_qty),
      low_threshold: String(ing.low_threshold),
      cost_per_unit_cents:
        ing.cost_per_unit_cents !== null ? String(ing.cost_per_unit_cents / 100) : "",
      supplier_id: ing.supplier_id || "",
    });
    setOpen(true);
  };

  const submit = async () => {
    if (!form.name.trim()) {
      toast.error("Nom requis");
      return;
    }
    setSaving(true);
    const cost = form.cost_per_unit_cents
      ? Math.round(parseFloat(form.cost_per_unit_cents.replace(",", ".")) * 100)
      : null;
    const payload = {
      restaurant_id: restaurantId,
      id: form.id,
      name: form.name.trim(),
      category: form.category.trim() || null,
      unit: form.unit,
      low_threshold: parseFloat(form.low_threshold.replace(",", ".")) || 0,
      supplier_id: form.supplier_id || null,
      cost_per_unit_cents: cost,
      ...(form.id ? {} : { current_qty: parseFloat(form.current_qty.replace(",", ".")) || 0 }),
    };
    const res = await fetch("/api/admin/stock/ingredients", {
      method: form.id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Erreur");
      return;
    }
    setOpen(false);
    toast.success(form.id ? "Modifié" : "Ingrédient ajouté");
    load();
  };

  const remove = async (ing: Ingredient) => {
    if (!confirm(`Supprimer "${ing.name}" ?`)) return;
    const res = await fetch(
      `/api/admin/stock/ingredients?id=${ing.id}&restaurant_id=${restaurantId}`,
      { method: "DELETE" }
    );
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Erreur");
      return;
    }
    toast.success("Supprimé");
    load();
  };

  return (
    <div className="space-y-6 px-4 py-6 md:px-8">
      <div className="flex items-center gap-2">
        <Link
          href={`/admin/${publicId}/stock`}
          className="-ml-1 inline-flex h-9 items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Link>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">
            ★ Catalogue
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">Ingrédients</h1>
        </div>
        <Button onClick={openCreate} className="rounded-xl">
          <Plus className="mr-2 h-4 w-4" />
          Ajouter
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="px-5 py-10 text-center text-sm text-muted-foreground">
              Chargement…
            </div>
          ) : items.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-muted-foreground">
              Aucun ingrédient pour l&apos;instant.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((ing) => (
                <li
                  key={ing.id}
                  className="flex items-center gap-3 px-5 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{ing.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {(ing.category || "—") +
                        " · " +
                        ing.current_qty +
                        " " +
                        ing.unit +
                        " · seuil " +
                        ing.low_threshold}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => openEdit(ing)}
                    aria-label="Modifier"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    onClick={() => remove(ing)}
                    aria-label="Supprimer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{form.id ? "Modifier l'ingrédient" : "Nouvel ingrédient"}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 px-4 py-2">
            <div>
              <Label className="text-sm font-medium">Nom</Label>
              <Input
                className="mt-1.5 h-11"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex. Tomates anciennes"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-medium">Catégorie</Label>
                <Input
                  className="mt-1.5 h-11"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder="Légumes"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Unité</Label>
                <select
                  className="mt-1.5 h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.unit}
                  onChange={(e) =>
                    setForm({ ...form, unit: e.target.value as IngredientUnit })
                  }
                >
                  {UNITS.map((u) => (
                    <option key={u.value} value={u.value}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {!form.id && (
                <div>
                  <Label className="text-sm font-medium">Quantité initiale</Label>
                  <Input
                    className="mt-1.5 h-11"
                    inputMode="decimal"
                    value={form.current_qty}
                    onChange={(e) => setForm({ ...form, current_qty: e.target.value })}
                  />
                </div>
              )}
              <div>
                <Label className="text-sm font-medium">Seuil bas</Label>
                <Input
                  className="mt-1.5 h-11"
                  inputMode="decimal"
                  value={form.low_threshold}
                  onChange={(e) => setForm({ ...form, low_threshold: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-medium">Coût (€/unité)</Label>
                <Input
                  className="mt-1.5 h-11"
                  inputMode="decimal"
                  value={form.cost_per_unit_cents}
                  onChange={(e) =>
                    setForm({ ...form, cost_per_unit_cents: e.target.value })
                  }
                  placeholder="0,00"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Fournisseur</Label>
                <select
                  className="mt-1.5 h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.supplier_id}
                  onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}
                >
                  <option value="">—</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
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
