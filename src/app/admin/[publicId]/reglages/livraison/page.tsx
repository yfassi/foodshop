"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Bike, Lock } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { getTierLabel } from "@/lib/subscription";
import type { DeliveryConfig, DeliveryCoords, DeliveryZone, SubscriptionTier } from "@/lib/types";
import { normalizeTier } from "@/lib/subscription";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DeliveryMapPicker } from "@/components/admin/delivery-map-picker";
import { DeliveryZoneBuilder } from "@/components/admin/delivery-zone-builder";
import { DriverManager } from "@/components/admin/driver-manager";

export default function ReglagesLivraisonPage() {
  const params = useParams<{ publicId: string }>();
  const [restaurantPublicId, setRestaurantPublicId] = useState<string | null>(null);
  const [restaurantAddress, setRestaurantAddress] = useState<string>("");
  const [addonActive, setAddonActive] = useState(false);
  const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier>("essentiel");
  const [enabled, setEnabled] = useState(false);
  const [coords, setCoords] = useState<DeliveryCoords | null>(null);
  const [prepTime, setPrepTime] = useState(20);
  const [maxRadius, setMaxRadius] = useState(5000);
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [loading, setLoading] = useState(true);
  const hasLoaded = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("restaurants")
        .select(
          "public_id, address, delivery_addon_active, delivery_enabled, delivery_config, subscription_tier",
        )
        .eq("public_id", params.publicId)
        .single();
      if (data) {
        setRestaurantPublicId(data.public_id);
        setRestaurantAddress(data.address ?? "");
        setAddonActive(data.delivery_addon_active ?? false);
        setSubscriptionTier(normalizeTier(data.subscription_tier));
        setEnabled(data.delivery_enabled ?? false);
        const dc = (data.delivery_config || {}) as DeliveryConfig;
        setCoords(dc.coords ?? null);
        setPrepTime(dc.prep_time_minutes ?? 20);
        setMaxRadius(dc.max_radius_m ?? 5000);
        setZones(dc.zones ?? []);
      }
      setLoading(false);
      setTimeout(() => {
        hasLoaded.current = true;
      }, 1500);
    };
    load();
  }, [params.publicId]);

  const save = useCallback(async () => {
    if (!hasLoaded.current || !restaurantPublicId || !addonActive) return;
    const payload = {
      restaurant_public_id: restaurantPublicId,
      delivery_enabled: enabled,
      delivery_config: {
        coords,
        prep_time_minutes: prepTime,
        max_radius_m: maxRadius,
        zones,
      },
    };
    const res = await fetch("/api/admin/delivery-config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Erreur lors de la sauvegarde");
    } else {
      toast.success("Enregistré");
    }
  }, [restaurantPublicId, addonActive, enabled, coords, prepTime, maxRadius, zones]);

  useEffect(() => {
    if (!hasLoaded.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(save, 800);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [save]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <AdminPageHeader
        kicker="Réglages"
        icon={Bike}
        title="Livraison"
        subtitle="Zones, livreurs et paramètres de la livraison à domicile."
      />

      <div className="space-y-4">
        {!addonActive ? (
          <Card size="sm" className="border-dashed">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Lock className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-sm">Module Livraison — 19 €/mois</CardTitle>
                  <CardDescription className="text-xs">
                    Ajoutez la livraison à domicile à votre offre.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Plan actuel : <strong>{getTierLabel(subscriptionTier)}</strong>.
                Contactez le support pour activer le module Livraison sur votre abonnement.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card size="sm">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Bike className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-sm">Activer la livraison</CardTitle>
                    <CardDescription className="text-xs">
                      Propose « Livraison » aux clients dans le checkout.
                    </CardDescription>
                  </div>
                  <CardAction>
                    <Switch
                      checked={enabled}
                      onCheckedChange={setEnabled}
                      aria-label="Activer la livraison"
                    />
                  </CardAction>
                </div>
              </CardHeader>
            </Card>

            {enabled && (
              <>
                <Card size="sm">
                  <CardHeader>
                    <CardTitle className="text-sm">Position & paramètres</CardTitle>
                    <CardDescription className="text-xs">
                      Déposez le pin sur votre restaurant.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <DeliveryMapPicker
                      value={coords}
                      defaultAddress={restaurantAddress}
                      onChange={setCoords}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="prep-time" className="text-xs">
                          Temps de préparation (min)
                        </Label>
                        <Input
                          id="prep-time"
                          type="number"
                          min={0}
                          step={5}
                          value={prepTime}
                          onChange={(e) =>
                            setPrepTime(Math.max(0, parseInt(e.target.value) || 0))
                          }
                          className="h-9 text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="max-radius" className="text-xs">
                          Rayon maximum (km)
                        </Label>
                        <Input
                          id="max-radius"
                          type="number"
                          min={0.5}
                          step={0.5}
                          value={maxRadius ? maxRadius / 1000 : ""}
                          onChange={(e) => {
                            const km = parseFloat(e.target.value) || 0;
                            setMaxRadius(Math.round(km * 1000));
                          }}
                          className="h-9 text-sm"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card size="sm">
                  <CardHeader>
                    <CardTitle className="text-sm">Zones</CardTitle>
                    <CardDescription className="text-xs">
                      Cercles concentriques triés par rayon. Le client paie le tarif
                      de la zone la plus proche.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <DeliveryZoneBuilder zones={zones} onChange={setZones} />
                  </CardContent>
                </Card>

                <Card size="sm">
                  <CardHeader>
                    <CardTitle className="text-sm">Livreurs</CardTitle>
                    <CardDescription className="text-xs">
                      Invitez des livreurs — ils se connectent par SMS.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <DriverManager publicId={params.publicId} />
                  </CardContent>
                </Card>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
