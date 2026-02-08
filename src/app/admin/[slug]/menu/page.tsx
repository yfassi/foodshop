"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Switch } from "@/components/ui/switch";
import { formatPrice } from "@/lib/format";
import { toast } from "sonner";
import type { Category, Product } from "@/lib/types";

interface CategoryWithProducts extends Category {
  products: Product[];
}

export default function MenuManagementPage() {
  const params = useParams<{ slug: string }>();
  const [categories, setCategories] = useState<CategoryWithProducts[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMenu = async () => {
      const supabase = createClient();

      const { data: restaurant } = await supabase
        .from("restaurants")
        .select("id")
        .eq("slug", params.slug)
        .single();

      if (!restaurant) return;

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
    };

    fetchMenu();
  }, [params.slug]);

  const toggleAvailability = async (productId: string, available: boolean) => {
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

    toast.success(available ? "Produit disponible" : "Produit indisponible");
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
      <h2 className="mb-4 text-lg font-bold">
        Gestion du menu
      </h2>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {categories.map((category) => (
          <div key={category.id}>
            <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
              {category.name}
            </h3>
            <div className="space-y-2">
              {category.products.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-card p-3"
                >
                  <div>
                    <p className="text-sm font-bold">{product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatPrice(product.price)}
                    </p>
                  </div>
                  <Switch
                    checked={product.is_available}
                    onCheckedChange={(checked) =>
                      toggleAvailability(product.id, checked)
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
