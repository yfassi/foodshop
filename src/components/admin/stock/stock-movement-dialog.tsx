"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
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
import type { StockItem, StockMovementType } from "@/lib/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restaurantSlug: string;
  item: StockItem | null;
  onSaved: () => void;
}

export function StockMovementDialog({ open, onOpenChange, restaurantSlug, item, onSaved }: Props) {
  const [type, setType] = useState<StockMovementType>("in");
  const [quantity, setQuantity] = useState("0");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setType("in");
      setQuantity("0");
      setReason("");
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!item) return;
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty === 0) {
      toast.error("Quantité invalide");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/stock/movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurant_slug: restaurantSlug,
          stock_item_id: item.id,
          type,
          quantity: qty,
          reason: reason.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erreur");
        return;
      }
      toast.success("Mouvement enregistré");
      onSaved();
      onOpenChange(false);
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setSaving(false);
    }
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mouvement — {item.name}</DialogTitle>
          <DialogDescription>
            Quantité actuelle : {item.current_qty} {item.unit}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as StockMovementType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="in">Entrée (réception)</SelectItem>
                <SelectItem value="out">Sortie (consommation)</SelectItem>
                <SelectItem value="adjustment">Ajustement (inventaire)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="mvt-qty">
              Quantité ({item.unit})
              {type === "adjustment" && (
                <span className="ml-1 text-xs text-muted-foreground">
                  (positive ou négative)
                </span>
              )}
            </Label>
            <Input
              id="mvt-qty"
              type="number"
              step="0.001"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mvt-reason">Raison (optionnel)</Label>
            <Input
              id="mvt-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Inventaire de fin de mois"
            />
          </div>
        </div>
        <DialogFooter className="flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={saving} className="flex-1">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
