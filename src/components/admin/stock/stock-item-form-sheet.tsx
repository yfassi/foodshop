"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { STOCK_UNITS, type StockItem, type StockUnit } from "@/lib/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restaurantSlug: string;
  item?: StockItem | null;
  onSaved: (item: StockItem) => void;
}

export function StockItemFormSheet({ open, onOpenChange, restaurantSlug, item, onSaved }: Props) {
  const isEdit = !!item;
  const [name, setName] = useState("");
  const [unit, setUnit] = useState<StockUnit>("kg");
  const [currentQty, setCurrentQty] = useState("0");
  const [reorderThreshold, setReorderThreshold] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(item?.name ?? "");
      setUnit(item?.unit ?? "kg");
      setCurrentQty(item ? String(item.current_qty) : "0");
      setReorderThreshold(
        item?.reorder_threshold !== null && item?.reorder_threshold !== undefined
          ? String(item.reorder_threshold)
          : ""
      );
      setNotes(item?.notes ?? "");
    }
  }, [open, item]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Nom requis");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        restaurant_slug: restaurantSlug,
        name: name.trim(),
        unit,
        current_qty: Number(currentQty) || 0,
        reorder_threshold: reorderThreshold === "" ? null : Number(reorderThreshold),
        notes: notes.trim() || null,
      };

      const url = isEdit
        ? `/api/admin/stock/items/${item!.id}`
        : `/api/admin/stock/items`;
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erreur");
        return;
      }
      toast.success(isEdit ? "Item modifié" : "Item créé");
      onSaved(data.item);
      onOpenChange(false);
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Modifier l'item" : "Nouvel item"}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 px-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="stock-name">Nom</Label>
            <Input
              id="stock-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Tomates"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="stock-unit">Unité</Label>
              <Select value={unit} onValueChange={(v) => setUnit(v as StockUnit)}>
                <SelectTrigger id="stock-unit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STOCK_UNITS.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="stock-qty">Quantité actuelle</Label>
              <Input
                id="stock-qty"
                type="number"
                step="0.001"
                min="0"
                value={currentQty}
                onChange={(e) => setCurrentQty(e.target.value)}
                disabled={isEdit}
              />
            </div>
          </div>
          {isEdit && (
            <p className="text-xs text-muted-foreground">
              La quantité se modifie via les mouvements (entrée, sortie, ajustement).
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="stock-threshold">Seuil bas niveau (optionnel)</Label>
            <Input
              id="stock-threshold"
              type="number"
              step="0.001"
              min="0"
              value={reorderThreshold}
              onChange={(e) => setReorderThreshold(e.target.value)}
              placeholder="Alerte si quantité &lt; seuil"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="stock-notes">Notes (optionnel)</Label>
            <textarea
              id="stock-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
        </div>
        <SheetFooter className="flex-row gap-2 px-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={saving} className="flex-1">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? "Enregistrer" : "Créer"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
