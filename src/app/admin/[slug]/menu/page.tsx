"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatPrice } from "@/lib/format";
import { toast } from "sonner";
import { Camera, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { ProductFormSheet } from "@/components/admin/product-form-sheet";
import type { Category, Product } from "@/lib/types";

interface CategoryWithProducts extends Category {
  products: Product[];
}

export default function MenuManagementPage() {
  const params = useParams<{ slug: string }>();
  const [categories, setCategories] = useState<CategoryWithProducts[]>([]);
  const [loading, setLoading] = useState(true);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);

  // Product sheet
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [defaultCategoryId, setDefaultCategoryId] = useState("");

  // Category dialog (create / edit)
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [savingCategory, setSavingCategory] = useState(false);

  // Category delete confirmation
  const [deletingCategory, setDeletingCategory] =
    useState<CategoryWithProducts | null>(null);

  const fetchMenu = useCallback(async () => {
    const supabase = createClient();

    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("id")
      .eq("slug", params.slug)
      .single();

    if (!restaurant) return;
    setRestaurantId(restaurant.id);

    const { data: cats } = await supabase
      .from("categories")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .order("sort_order", { ascending: true })
      .returns<Category[]>();

    const { data: prods } = await supabase
      .from("products")
      .select("*")
      .in(
        "category_id",
        (cats || []).map((c) => c.id)
      )
      .order("sort_order", { ascending: true })
      .returns<Product[]>();

    const productsByCategory = new Map<string, Product[]>();
    for (const p of prods || []) {
      const list = productsByCategory.get(p.category_id) || [];
      list.push(p);
      productsByCategory.set(p.category_id, list);
    }

    setCategories(
      (cats || []).map((c) => ({
        ...c,
        products: productsByCategory.get(c.id) || [],
      }))
    );
    setLoading(false);
  }, [params.slug]);

  useEffect(() => {
    fetchMenu();
  }, [fetchMenu]);

  // --- Product actions ---

  const toggleAvailability = async (
    productId: string,
    available: boolean
  ) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("products")
      .update({ is_available: available })
      .eq("id", productId);

    if (error) {
      toast.error("Erreur lors de la mise a jour");
      return;
    }

    setCategories((prev) =>
      prev.map((cat) => ({
        ...cat,
        products: cat.products.map((p) =>
          p.id === productId ? { ...p, is_available: available } : p
        ),
      }))
    );
  };

  const openNewProduct = (categoryId: string) => {
    setEditingProduct(null);
    setDefaultCategoryId(categoryId);
    setSheetOpen(true);
  };

  const openEditProduct = (product: Product) => {
    setEditingProduct(product);
    setDefaultCategoryId(product.category_id);
    setSheetOpen(true);
  };

  // --- Category actions ---

  const openNewCategory = () => {
    setEditingCategory(null);
    setCategoryName("");
    setCategoryDialogOpen(true);
  };

  const openEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setCategoryName(cat.name);
    setCategoryDialogOpen(true);
  };

  const saveCategory = async () => {
    if (!categoryName.trim() || !restaurantId) return;

    setSavingCategory(true);
    const supabase = createClient();

    if (editingCategory) {
      const { error } = await supabase
        .from("categories")
        .update({ name: categoryName.trim() })
        .eq("id", editingCategory.id);

      if (error) {
        toast.error("Erreur lors de la mise a jour");
        setSavingCategory(false);
        return;
      }
      toast.success("Categorie renommee");
    } else {
      const { error } = await supabase.from("categories").insert({
        name: categoryName.trim(),
        restaurant_id: restaurantId,
        sort_order: categories.length,
      });

      if (error) {
        toast.error("Erreur lors de la creation");
        setSavingCategory(false);
        return;
      }
      toast.success("Categorie creee");
    }

    setCategoryName("");
    setCategoryDialogOpen(false);
    setSavingCategory(false);
    fetchMenu();
  };

  const confirmDeleteCategory = (cat: CategoryWithProducts) => {
    if (cat.products.length === 0) {
      doDeleteCategory(cat.id);
    } else {
      setDeletingCategory(cat);
    }
  };

  const doDeleteCategory = async (categoryId: string) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", categoryId);

    if (error) {
      toast.error("Erreur lors de la suppression");
      return;
    }

    toast.success("Categorie supprimee");
    setDeletingCategory(null);
    fetchMenu();
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="px-4 py-4 md:px-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-bold">Menu</h2>
          <Button variant="outline" size="sm" onClick={openNewCategory}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            Categorie
          </Button>
        </div>

        <div className="space-y-8">
          {categories.map((category) => (
            <section key={category.id}>
              {/* Category header */}
              <div className="mb-3 flex items-center gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {category.name}
                </h3>
                <div className="h-px flex-1 bg-border" />
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={() => openEditCategory(category)}
                    className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground/60 transition-colors hover:text-foreground"
                    title="Renommer"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => confirmDeleteCategory(category)}
                    className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground/60 transition-colors hover:text-destructive"
                    title="Supprimer"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => openNewProduct(category.id)}
                    className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground/60 transition-colors hover:text-primary"
                    title="Ajouter un produit"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Product list */}
              <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                {category.products.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => openEditProduct(product)}
                    className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-accent/50"
                  >
                    {/* Image */}
                    {product.image_url ? (
                      <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg">
                        <Image
                          src={product.image_url}
                          alt={product.name}
                          fill
                          className="object-cover"
                          sizes="44px"
                        />
                      </div>
                    ) : (
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <Camera className="h-4 w-4 text-muted-foreground/50" />
                      </div>
                    )}

                    {/* Name + price */}
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm font-medium ${!product.is_available ? "text-muted-foreground line-through" : ""}`}
                      >
                        {product.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatPrice(product.price)}
                      </p>
                    </div>

                    {/* Toggle */}
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="shrink-0"
                    >
                      <Switch
                        checked={product.is_available}
                        onCheckedChange={(checked) =>
                          toggleAvailability(product.id, checked)
                        }
                      />
                    </div>
                  </button>
                ))}

                {category.products.length === 0 && (
                  <button
                    onClick={() => openNewProduct(category.id)}
                    className="flex w-full items-center justify-center gap-2 p-6 text-sm text-muted-foreground transition-colors hover:text-primary"
                  >
                    <Plus className="h-4 w-4" />
                    Ajouter un produit
                  </button>
                )}
              </div>
            </section>
          ))}

          {categories.length === 0 && (
            <div className="py-12 text-center">
              <p className="mb-3 text-sm text-muted-foreground">
                Aucune categorie pour le moment.
              </p>
              <Button variant="outline" onClick={openNewCategory}>
                <Plus className="mr-1 h-3.5 w-3.5" />
                Creer une categorie
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Product form sheet */}
      {restaurantId && (
        <ProductFormSheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          product={editingProduct}
          categories={categories}
          defaultCategoryId={defaultCategoryId}
          restaurantId={restaurantId}
          onSaved={fetchMenu}
        />
      )}

      {/* Category create/edit dialog */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Renommer la categorie" : "Nouvelle categorie"}
            </DialogTitle>
            <DialogDescription>
              {editingCategory
                ? "Modifiez le nom de cette categorie."
                : "Ajoutez une categorie pour organiser vos produits."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="cat-name">Nom</Label>
            <Input
              id="cat-name"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              placeholder="Ex: Tacos, Boissons, Desserts..."
              onKeyDown={(e) => e.key === "Enter" && saveCategory()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              onClick={saveCategory}
              disabled={savingCategory || !categoryName.trim()}
            >
              {savingCategory && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {editingCategory ? "Enregistrer" : "Creer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category delete confirmation */}
      <Dialog
        open={!!deletingCategory}
        onOpenChange={(o) => !o && setDeletingCategory(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer la categorie</DialogTitle>
            <DialogDescription>
              La categorie &laquo;&nbsp;{deletingCategory?.name}&nbsp;&raquo;
              contient {deletingCategory?.products.length} produit
              {(deletingCategory?.products.length || 0) > 1 ? "s" : ""} qui
              seront aussi supprimes. Cette action est irreversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeletingCategory(null)}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                deletingCategory && doDeleteCategory(deletingCategory.id)
              }
            >
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
