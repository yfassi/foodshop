"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { ArrowLeft, Loader2, Plus, Trash2, Utensils } from "lucide-react";
import { toast } from "sonner";
import type { Ingredient, Recipe, RecipeItem } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ProductLite {
  id: string;
  name: string;
}

interface DraftItem {
  ingredient_id: string;
  quantity: string;
}

export function RecipesClient({
  publicId,
  restaurantId,
  products,
}: {
  publicId: string;
  restaurantId: string;
  products: ProductLite[];
}) {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [items, setItems] = useState<RecipeItem[]>([]);
  const [editingProduct, setEditingProduct] = useState<ProductLite | null>(null);
  const [drafts, setDrafts] = useState<DraftItem[]>([]);
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [a, b] = await Promise.all([
      fetch(`/api/admin/stock/ingredients?restaurant_id=${restaurantId}`).then((r) =>
        r.json()
      ),
      fetch(`/api/admin/stock/recipes?restaurant_id=${restaurantId}`).then((r) => r.json()),
    ]);
    setIngredients(a.ingredients || []);
    setRecipes(b.recipes || []);
    setItems(b.items || []);
    setLoading(false);
  }, [restaurantId]);

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  const recipeByProduct = useMemo(() => {
    const m = new Map<string, Recipe>();
    for (const r of recipes) m.set(r.product_id, r);
    return m;
  }, [recipes]);

  const itemsByRecipe = useMemo(() => {
    const m = new Map<string, RecipeItem[]>();
    for (const it of items) {
      const arr = m.get(it.recipe_id) || [];
      arr.push(it);
      m.set(it.recipe_id, arr);
    }
    return m;
  }, [items]);

  const ingredientById = useMemo(() => {
    const m = new Map<string, Ingredient>();
    for (const i of ingredients) m.set(i.id, i);
    return m;
  }, [ingredients]);

  const openEdit = (p: ProductLite) => {
    const recipe = recipeByProduct.get(p.id);
    const recipeItems = recipe ? itemsByRecipe.get(recipe.id) || [] : [];
    setEditingProduct(p);
    setEnabled(recipe ? recipe.is_enabled : true);
    setDrafts(
      recipeItems.length > 0
        ? recipeItems.map((it) => ({
            ingredient_id: it.ingredient_id,
            quantity: String(it.quantity),
          }))
        : [{ ingredient_id: "", quantity: "" }]
    );
  };

  const submit = async () => {
    if (!editingProduct) return;
    setSaving(true);
    const cleanItems = drafts
      .filter((d) => d.ingredient_id)
      .map((d) => ({
        ingredient_id: d.ingredient_id,
        quantity: parseFloat(d.quantity.replace(",", ".")) || 0,
      }))
      .filter((d) => d.quantity > 0);

    const res = await fetch("/api/admin/stock/recipes", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        restaurant_id: restaurantId,
        product_id: editingProduct.id,
        is_enabled: enabled,
        items: cleanItems,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Erreur");
      return;
    }
    toast.success("Recette enregistrée");
    setEditingProduct(null);
    load();
  };

  return (
    <div className="space-y-6">
      <Link
        href={`/admin/${publicId}/stock`}
        className="-ml-1 inline-flex h-9 items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour
      </Link>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">
          ★ Recettes
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">
          Décrément automatique
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Reliez chaque produit du menu à ses ingrédients pour décompter le stock à
          chaque commande.
        </p>
      </div>

      {ingredients.length === 0 && !loading && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 px-5 py-8 text-center">
            <Utensils className="h-6 w-6 text-muted-foreground" />
            <p className="text-sm">
              Ajoutez d&apos;abord des ingrédients pour pouvoir composer vos recettes.
            </p>
            <Link href={`/admin/${publicId}/stock/ingredients`}>
              <Button size="sm" className="rounded-xl">
                Ajouter un ingrédient
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="px-5 py-10 text-center text-sm text-muted-foreground">
              Chargement…
            </div>
          ) : products.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-muted-foreground">
              Aucun produit dans le menu.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {products.map((p) => {
                const recipe = recipeByProduct.get(p.id);
                const ri = recipe ? itemsByRecipe.get(recipe.id) || [] : [];
                return (
                  <li
                    key={p.id}
                    className="flex items-center gap-3 px-5 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{p.name}</p>
                      <p
                        className={cn(
                          "truncate text-[11px]",
                          ri.length === 0
                            ? "text-muted-foreground"
                            : "text-foreground/70"
                        )}
                      >
                        {ri.length === 0
                          ? "Aucune recette"
                          : `${ri.length} ingrédient${ri.length > 1 ? "s" : ""}`}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-lg"
                      onClick={() => openEdit(p)}
                      disabled={ingredients.length === 0}
                    >
                      {ri.length === 0 ? "Composer" : "Modifier"}
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Sheet
        open={editingProduct !== null}
        onOpenChange={(o) => {
          if (!o) setEditingProduct(null);
        }}
      >
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>
              {editingProduct ? `Recette · ${editingProduct.name}` : "Recette"}
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-3 px-4 py-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="h-4 w-4"
              />
              Recette active (déduit du stock)
            </label>

            <div className="space-y-2">
              {drafts.map((d, idx) => {
                const ing = ingredientById.get(d.ingredient_id);
                return (
                  <div key={idx} className="flex items-end gap-2">
                    <div className="flex-1">
                      {idx === 0 && <Label className="text-xs">Ingrédient</Label>}
                      <select
                        className="mt-1 h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                        value={d.ingredient_id}
                        onChange={(e) => {
                          const next = [...drafts];
                          next[idx] = { ...next[idx], ingredient_id: e.target.value };
                          setDrafts(next);
                        }}
                      >
                        <option value="">— Choisir —</option>
                        {ingredients.map((i) => (
                          <option key={i.id} value={i.id}>
                            {i.name} ({i.unit})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="w-24">
                      {idx === 0 && (
                        <Label className="text-xs">Qté{ing ? ` (${ing.unit})` : ""}</Label>
                      )}
                      <Input
                        className="mt-1 h-11"
                        inputMode="decimal"
                        value={d.quantity}
                        onChange={(e) => {
                          const next = [...drafts];
                          next[idx] = { ...next[idx], quantity: e.target.value };
                          setDrafts(next);
                        }}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-11 w-11 p-0 text-muted-foreground"
                      onClick={() =>
                        setDrafts(drafts.filter((_, i) => i !== idx))
                      }
                      aria-label="Retirer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
              <Button
                variant="outline"
                size="sm"
                className="rounded-lg"
                onClick={() => setDrafts([...drafts, { ingredient_id: "", quantity: "" }])}
              >
                <Plus className="mr-1 h-4 w-4" />
                Ajouter une ligne
              </Button>
            </div>
          </div>
          <SheetFooter>
            <Button
              onClick={submit}
              disabled={saving}
              className="h-11 w-full rounded-xl"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enregistrer"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
