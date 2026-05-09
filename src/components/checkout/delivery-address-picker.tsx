"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { formatPrice } from "@/lib/format";
import { useCartStore } from "@/stores/cart-store";
import type { DeliveryAddress } from "@/lib/types";
import "leaflet/dist/leaflet.css";

type Leaflet = typeof import("leaflet");

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  address?: {
    road?: string;
    house_number?: string;
    city?: string;
    town?: string;
    village?: string;
    postcode?: string;
  };
}

interface CalcResponse {
  zone_id?: string;
  zone_label?: string;
  fee?: number;
  min_order?: number;
  distance_m?: number;
  error?: string;
}

export function DeliveryAddressPicker({
  publicId,
  restaurantCoords,
}: {
  publicId: string;
  restaurantCoords?: { lat: number; lng: number } | null;
}) {
  const deliveryAddress = useCartStore((s) => s.deliveryAddress);
  const deliveryFee = useCartStore((s) => s.deliveryFee);
  const deliveryMinOrder = useCartStore((s) => s.deliveryMinOrder);
  const setDelivery = useCartStore((s) => s.setDelivery);
  const clearDelivery = useCartStore((s) => s.clearDelivery);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markerRef = useRef<import("leaflet").Marker | null>(null);
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [floorNotes, setFloorNotes] = useState(
    deliveryAddress?.floor_notes || ""
  );
  const [outOfZone, setOutOfZone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default as Leaflet;
      if (cancelled || !containerRef.current || mapRef.current) return;

      const initial =
        deliveryAddress && {
          lat: deliveryAddress.lat,
          lng: deliveryAddress.lng,
        }
        ? { lat: deliveryAddress!.lat, lng: deliveryAddress!.lng }
        : restaurantCoords || { lat: 48.8566, lng: 2.3522 };

      const map = L.map(containerRef.current, {
        center: [initial.lat, initial.lng],
        zoom: 14,
        zoomControl: true,
      });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
        maxZoom: 19,
      }).addTo(map);

      const icon = L.icon({
        iconUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });

      const marker = L.marker([initial.lat, initial.lng], {
        draggable: true,
        icon,
      }).addTo(map);

      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        reverseAndCalculate(pos.lat, pos.lng);
      });

      map.on("click", (e) => {
        marker.setLatLng(e.latlng);
        reverseAndCalculate(e.latlng.lat, e.latlng.lng);
      });

      mapRef.current = map;
      markerRef.current = marker;
      setMounted(true);
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reverseGeocode = async (
    lat: number,
    lng: number
  ): Promise<Partial<DeliveryAddress>> => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        { headers: { "Accept-Language": "fr" } }
      );
      if (!res.ok) throw new Error("reverse_failed");
      const data: NominatimResult = await res.json();
      const a = data.address || {};
      const street = [a.house_number, a.road].filter(Boolean).join(" ");
      return {
        formatted: data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        street: street || undefined,
        city: a.city || a.town || a.village || undefined,
        postal_code: a.postcode || undefined,
      };
    } catch {
      return { formatted: `${lat.toFixed(5)}, ${lng.toFixed(5)}` };
    }
  };

  const reverseAndCalculate = async (lat: number, lng: number) => {
    setCalculating(true);
    setOutOfZone(false);
    const [addr, feeInfo] = await Promise.all([
      reverseGeocode(lat, lng),
      calculateFee(lat, lng),
    ]);

    if (feeInfo?.error === "out_of_zone") {
      setOutOfZone(true);
      clearDelivery();
      toast.error("Cette adresse est hors zone de livraison");
      setCalculating(false);
      return;
    }
    if (!feeInfo || feeInfo.error) {
      toast.error(feeInfo?.error || "Impossible de calculer les frais");
      setCalculating(false);
      return;
    }

    setDelivery({
      address: {
        lat,
        lng,
        formatted: addr.formatted || "",
        street: addr.street,
        city: addr.city,
        postal_code: addr.postal_code,
        floor_notes: floorNotes || undefined,
      },
      fee: feeInfo.fee ?? 0,
      zoneId: feeInfo.zone_id ?? null,
      minOrder: feeInfo.min_order ?? 0,
      distanceM: feeInfo.distance_m ?? null,
    });
    setCalculating(false);
  };

  const calculateFee = async (
    lat: number,
    lng: number
  ): Promise<CalcResponse | null> => {
    try {
      const res = await fetch("/api/checkout/calculate-delivery-fee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurant_public_id: publicId, lat, lng }),
      });
      return await res.json();
    } catch {
      return null;
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
          searchQuery
        )}&addressdetails=1&countrycodes=fr`,
        { headers: { "Accept-Language": "fr" } }
      );
      const data: NominatimResult[] = await res.json();
      if (!data.length) {
        toast.error("Adresse introuvable");
        return;
      }
      const lat = parseFloat(data[0].lat);
      const lng = parseFloat(data[0].lon);
      if (markerRef.current && mapRef.current) {
        markerRef.current.setLatLng([lat, lng]);
        mapRef.current.setView([lat, lng], 16);
      }
      reverseAndCalculate(lat, lng);
    } catch {
      toast.error("Erreur de recherche");
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    if (!deliveryAddress) return;
    const updated = { ...deliveryAddress, floor_notes: floorNotes || undefined };
    if (updated.floor_notes !== deliveryAddress.floor_notes) {
      setDelivery({
        address: updated,
        fee: deliveryFee,
        zoneId: useCartStore.getState().deliveryZoneId,
        minOrder: deliveryMinOrder,
        distanceM: useCartStore.getState().deliveryDistanceM,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [floorNotes]);

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Adresse de livraison</Label>

      <form onSubmit={handleSearch} className="flex gap-2">
        <Input
          placeholder="Rechercher une adresse…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1"
        />
        <Button type="submit" disabled={searching} variant="outline" size="icon">
          {searching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </Button>
      </form>

      <div
        ref={containerRef}
        className="h-64 w-full overflow-hidden rounded-xl border border-border"
      />
      {!mounted && (
        <p className="text-xs text-muted-foreground">Chargement de la carte…</p>
      )}

      {calculating && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Calcul des frais…
        </div>
      )}

      {deliveryAddress && !outOfZone && (
        <div className="rounded-xl bg-muted/40 p-3 text-sm">
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div className="flex-1">
              <p className="font-medium">{deliveryAddress.formatted}</p>
              {deliveryFee > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Frais de livraison :{" "}
                  <span className="font-semibold text-foreground">
                    {formatPrice(deliveryFee)}
                  </span>
                  {deliveryMinOrder > 0 && (
                    <>
                      {" "}
                      · Minimum de commande{" "}
                      <span className="font-semibold text-foreground">
                        {formatPrice(deliveryMinOrder)}
                      </span>
                    </>
                  )}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {outOfZone && (
        <p className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
          Adresse hors zone de livraison. Déplacez le pin sur une zone
          desservie.
        </p>
      )}

      <div>
        <Label htmlFor="floor-notes" className="text-xs text-muted-foreground">
          Étage, interphone, instructions (optionnel)
        </Label>
        <Input
          id="floor-notes"
          placeholder="Ex : 3e étage, code 1234B"
          value={floorNotes}
          onChange={(e) => setFloorNotes(e.target.value.slice(0, 300))}
          className="mt-1"
        />
      </div>
    </div>
  );
}
