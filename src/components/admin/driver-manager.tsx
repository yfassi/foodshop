"use client";

import { useCallback, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, User, Phone } from "lucide-react";
import type { Driver } from "@/lib/types";

export function DriverManager({ publicId }: { publicId: string }) {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [saving, setSaving] = useState(false);

  const loadDrivers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/drivers?restaurant_public_id=${encodeURIComponent(publicId)}`
      );
      const data = await res.json();
      if (res.ok) setDrivers(data.drivers || []);
    } catch {
      // ignore
    }
    setLoading(false);
  }, [publicId]);

  useEffect(() => {
    loadDrivers();
  }, [loadDrivers]);

  const handleCreate = async () => {
    if (!fullName.trim() || !phone.trim()) {
      toast.error("Nom et téléphone requis");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/drivers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurant_public_id: publicId,
          full_name: fullName.trim(),
          phone: phone.trim(),
          vehicle: vehicle.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      toast.success("Livreur ajouté");
      setDialogOpen(false);
      setFullName("");
      setPhone("");
      setVehicle("");
      loadDrivers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
    setSaving(false);
  };

  const toggleActive = async (driver: Driver) => {
    try {
      const res = await fetch(`/api/admin/drivers/${driver.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurant_public_id: publicId,
          is_active: !driver.is_active,
        }),
      });
      if (!res.ok) throw new Error();
      setDrivers((prev) =>
        prev.map((d) =>
          d.id === driver.id ? { ...d, is_active: !d.is_active } : d
        )
      );
    } catch {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const handleDelete = async (driver: Driver) => {
    if (!confirm(`Supprimer ${driver.full_name} ?`)) return;
    try {
      const res = await fetch(`/api/admin/drivers/${driver.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurant_public_id: publicId }),
      });
      if (!res.ok) throw new Error();
      setDrivers((prev) => prev.filter((d) => d.id !== driver.id));
      toast.success("Livreur supprimé");
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Livreurs ({drivers.length})</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setDialogOpen(true)}
          type="button"
        >
          <Plus className="mr-1 h-3.5 w-3.5" />
          Inviter
        </Button>
      </div>

      {loading ? (
        <div className="flex h-16 items-center justify-center">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : drivers.length === 0 ? (
        <p className="py-3 text-center text-xs text-muted-foreground">
          Aucun livreur. Cliquez sur « Inviter » pour ajouter votre premier
          livreur.
        </p>
      ) : (
        <div className="space-y-2">
          {drivers.map((driver) => (
            <div
              key={driver.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                <User className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {driver.full_name}
                </p>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Phone className="h-3 w-3" />
                  {driver.phone}
                  {driver.vehicle && (
                    <span className="ml-1">· {driver.vehicle}</span>
                  )}
                  {!driver.user_id && (
                    <span className="ml-1 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                      Pas connecté
                    </span>
                  )}
                </p>
              </div>
              <Switch
                checked={driver.is_active}
                onCheckedChange={() => toggleActive(driver)}
              />
              <button
                type="button"
                onClick={() => handleDelete(driver)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Inviter un livreur</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Nom complet</Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Paul Dupont"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Téléphone (E.164)</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+33612345678"
                className="h-9 text-sm"
              />
              <p className="text-[11px] text-muted-foreground">
                Le livreur se connectera avec ce numéro via SMS.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Véhicule (optionnel)</Label>
              <Input
                value={vehicle}
                onChange={(e) => setVehicle(e.target.value)}
                placeholder="Scooter, Vélo…"
                className="h-9 text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleCreate}
              disabled={saving}
              type="button"
              className="w-full"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Ajouter le livreur"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
