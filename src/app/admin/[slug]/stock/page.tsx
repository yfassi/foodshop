"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TypographyH2, TypographyMuted } from "@/components/ui/typography";
import { Camera, Plus, Package, History, Edit2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { StockItemFormSheet } from "@/components/admin/stock/stock-item-form-sheet";
import { StockMovementDialog } from "@/components/admin/stock/stock-movement-dialog";
import { StockLowBadge } from "@/components/admin/stock/stock-low-badge";
import type { StockItem, StockMovement } from "@/lib/types";

interface MovementWithItem extends StockMovement {
  stock_items?: { name: string; unit: string };
}

export default function StockPage() {
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const qs = searchParams.get("demo") === "true" ? "?demo=true" : "";

  const [items, setItems] = useState<StockItem[]>([]);
  const [movements, setMovements] = useState<MovementWithItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);

  const [editingItem, setEditingItem] = useState<StockItem | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [movementItem, setMovementItem] = useState<StockItem | null>(null);
  const [movementOpen, setMovementOpen] = useState(false);
  const [deleteItem, setDeleteItem] = useState<StockItem | null>(null);

  const fetchItems = useCallback(async () => {
    const res = await fetch(`/api/admin/stock/items?restaurant_slug=${params.slug}`);
    const data = await res.json();
    if (res.ok) setItems(data.items || []);
  }, [params.slug]);

  const fetchMovements = useCallback(async (rid: string) => {
    const supabase = createClient();
    const { data } = await supabase
      .from("stock_movements")
      .select("*, stock_items(name, unit)")
      .eq("restaurant_id", rid)
      .order("created_at", { ascending: false })
      .limit(20);
    setMovements(data || []);
  }, []);

  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const { data: r } = await supabase
        .from("restaurants")
        .select("id")
        .eq("slug", params.slug)
        .single();
      if (r) {
        setRestaurantId(r.id);
        await Promise.all([fetchItems(), fetchMovements(r.id)]);
      }
      setLoading(false);
    };
    init();
  }, [params.slug, fetchItems, fetchMovements]);

  // Realtime subscriptions
  useEffect(() => {
    if (!restaurantId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`stock:${restaurantId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "stock_items", filter: `restaurant_id=eq.${restaurantId}` },
        () => fetchItems()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "stock_movements", filter: `restaurant_id=eq.${restaurantId}` },
        () => {
          fetchItems();
          fetchMovements(restaurantId);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId, fetchItems, fetchMovements]);

  const handleDelete = async () => {
    if (!deleteItem) return;
    const res = await fetch(
      `/api/admin/stock/items/${deleteItem.id}?restaurant_slug=${params.slug}`,
      { method: "DELETE" }
    );
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || "Erreur");
      return;
    }
    toast.success("Item supprimé");
    setDeleteItem(null);
    fetchItems();
  };

  const isLow = (item: StockItem) =>
    item.reorder_threshold !== null &&
    item.current_qty < item.reorder_threshold;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <TypographyH2>Stock</TypographyH2>
          <TypographyMuted>Suivez vos quantités et scannez vos tickets</TypographyMuted>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { setEditingItem(null); setFormOpen(true); }}>
            <Plus className="mr-1.5 h-4 w-4" />
            Ajouter un item
          </Button>
          <Link href={`/admin/${params.slug}/stock/scan${qs}`}>
            <Button size="sm">
              <Camera className="mr-1.5 h-4 w-4" />
              Scanner un ticket
            </Button>
          </Link>
        </div>
      </div>

      {/* Items list */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="h-4 w-4" />
            Inventaire ({items.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="py-12 text-center">
              <Package className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm font-medium">Aucun item en stock</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Ajoutez vos premiers items ou scannez un ticket de courses.
              </p>
              <Button
                size="sm"
                className="mt-4"
                onClick={() => { setEditingItem(null); setFormOpen(true); }}
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Ajouter un item
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="pb-2 font-medium">Nom</th>
                    <th className="pb-2 font-medium">Unité</th>
                    <th className="pb-2 text-right font-medium">Qté actuelle</th>
                    <th className="pb-2 text-right font-medium">Seuil</th>
                    <th className="pb-2 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{item.name}</span>
                          {isLow(item) && <StockLowBadge />}
                        </div>
                        {item.notes && (
                          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                            {item.notes}
                          </p>
                        )}
                      </td>
                      <td className="py-3 text-muted-foreground">{item.unit}</td>
                      <td className="py-3 text-right tabular-nums font-medium">
                        {Number(item.current_qty).toLocaleString("fr-FR", {
                          maximumFractionDigits: 3,
                        })}
                      </td>
                      <td className="py-3 text-right tabular-nums text-muted-foreground">
                        {item.reorder_threshold !== null
                          ? Number(item.reorder_threshold).toLocaleString("fr-FR", {
                              maximumFractionDigits: 3,
                            })
                          : "—"}
                      </td>
                      <td className="py-3">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setMovementItem(item);
                              setMovementOpen(true);
                            }}
                            className="h-8 px-2"
                            aria-label="Mouvement"
                          >
                            <History className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingItem(item);
                              setFormOpen(true);
                            }}
                            className="h-8 px-2"
                            aria-label="Modifier"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setDeleteItem(item)}
                            className="h-8 px-2 text-destructive hover:text-destructive"
                            aria-label="Supprimer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent movements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4" />
            Mouvements récents
          </CardTitle>
        </CardHeader>
        <CardContent>
          {movements.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Aucun mouvement enregistré.
            </p>
          ) : (
            <ul className="space-y-2">
              {movements.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between gap-3 rounded-md border p-2.5 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{m.stock_items?.name || "—"}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(m.created_at).toLocaleString("fr-FR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                      {m.reason && ` · ${m.reason}`}
                    </p>
                  </div>
                  <span
                    className={`tabular-nums text-sm font-semibold ${
                      m.quantity > 0 ? "text-emerald-600" : "text-rose-600"
                    }`}
                  >
                    {m.quantity > 0 ? "+" : ""}
                    {Number(m.quantity).toLocaleString("fr-FR", {
                      maximumFractionDigits: 3,
                    })}{" "}
                    {m.stock_items?.unit}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <StockItemFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        restaurantSlug={params.slug}
        item={editingItem}
        onSaved={() => {
          fetchItems();
        }}
      />

      <StockMovementDialog
        open={movementOpen}
        onOpenChange={setMovementOpen}
        restaurantSlug={params.slug}
        item={movementItem}
        onSaved={() => {
          fetchItems();
          if (restaurantId) fetchMovements(restaurantId);
        }}
      />

      <Dialog open={!!deleteItem} onOpenChange={(o) => !o && setDeleteItem(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Supprimer cet item ?</DialogTitle>
            <DialogDescription>
              {deleteItem?.name} sera supprimé définitivement avec son historique.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row gap-2">
            <Button variant="outline" onClick={() => setDeleteItem(null)} className="flex-1">
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleDelete} className="flex-1">
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
