"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, MapPin } from "lucide-react";
import type { DeliveryZone } from "@/lib/types";
import { formatPrice } from "@/lib/format";

export function DeliveryZoneBuilder({
  zones,
  onChange,
}: {
  zones: DeliveryZone[];
  onChange: (zones: DeliveryZone[]) => void;
}) {
  const sorted = [...zones].sort((a, b) => a.radius_m - b.radius_m);

  const addZone = () => {
    const maxRadius =
      sorted.length > 0 ? sorted[sorted.length - 1].radius_m : 0;
    const newZone: DeliveryZone = {
      id: crypto.randomUUID(),
      label: "",
      radius_m: maxRadius + 1500,
      fee: 250,
      min_order: 0,
    };
    onChange([...zones, newZone]);
  };

  const updateZone = (id: string, updates: Partial<DeliveryZone>) => {
    onChange(zones.map((z) => (z.id === id ? { ...z, ...updates } : z)));
  };

  const removeZone = (id: string) => {
    onChange(zones.filter((z) => z.id !== id));
  };

  return (
    <div className="space-y-5">
      {sorted.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Aperçu zones
          </p>
          <div className="space-y-2">
            {sorted.map((zone, i) => {
              const prev = i > 0 ? sorted[i - 1].radius_m : 0;
              return (
                <div
                  key={zone.id}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    <span className="font-medium">
                      {zone.label || `Zone ${i + 1}`}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {(prev / 1000).toFixed(1)} – {(zone.radius_m / 1000).toFixed(1)} km
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold text-primary">
                      {formatPrice(zone.fee)}
                    </span>
                    {zone.min_order > 0 && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        min {formatPrice(zone.min_order)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {sorted.map((zone, i) => (
        <div key={zone.id} className="rounded-xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {i + 1}
              </div>
              <span className="text-sm font-semibold">Zone {i + 1}</span>
            </div>
            <button
              onClick={() => removeZone(zone.id)}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              type="button"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Nom de la zone</Label>
              <Input
                value={zone.label}
                onChange={(e) => updateZone(zone.id, { label: e.target.value })}
                placeholder="Ex : Centre-ville, Proche"
                className="h-9 text-sm"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Rayon max (km)</Label>
                <Input
                  type="number"
                  min={0.1}
                  step={0.1}
                  value={zone.radius_m ? zone.radius_m / 1000 : ""}
                  onChange={(e) => {
                    const km = parseFloat(e.target.value) || 0;
                    updateZone(zone.id, { radius_m: Math.round(km * 1000) });
                  }}
                  placeholder="1.5"
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Frais (EUR)</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.5}
                  value={zone.fee ? zone.fee / 100 : ""}
                  onChange={(e) => {
                    const euros = parseFloat(e.target.value) || 0;
                    updateZone(zone.id, { fee: Math.round(euros * 100) });
                  }}
                  placeholder="2.50"
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Min. commande (EUR)</Label>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  value={zone.min_order ? zone.min_order / 100 : ""}
                  onChange={(e) => {
                    const euros = parseFloat(e.target.value) || 0;
                    updateZone(zone.id, { min_order: Math.round(euros * 100) });
                  }}
                  placeholder="15"
                  className="h-9 text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      ))}

      <Button variant="outline" onClick={addZone} className="w-full" type="button">
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        Ajouter une zone
      </Button>
    </div>
  );
}
