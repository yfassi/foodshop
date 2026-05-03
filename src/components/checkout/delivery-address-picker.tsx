"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { formatPrice } from "@/lib/format";
import { useCartStore } from "@/stores/cart-store";
import type { DeliveryAddress } from "@/lib/types";
import "leaflet/dist/leaflet.css";

type Leaflet = typeof import("leaflet");

const TAAPR_PIN_HTML = `
  <div class="taapr-pin">
    <svg viewBox="0 0 36 46" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M18 2C9.7 2 3 8.6 3 16.7c0 11.3 13 26.4 14.2 27.7.5.6 1.1.6 1.6 0C20 43.1 33 28 33 16.7 33 8.6 26.3 2 18 2Z"
            fill="#E64A19" stroke="#1A1410" stroke-width="1.4" stroke-linejoin="round"/>
      <circle cx="18" cy="17" r="6" fill="#F4ECDB" stroke="#1A1410" stroke-width="1.2"/>
    </svg>
    <span class="taapr-pin-pulse"></span>
  </div>
`;

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
  slug,
  restaurantCoords,
}: {
  slug: string;
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
      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
        {
          attribution:
            '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · © <a href="https://carto.com/attributions">CARTO</a>',
          subdomains: "abcd",
          maxZoom: 20,
        },
      ).addTo(map);

      const icon = L.divIcon({
        className: "taapr-pin-icon",
        html: TAAPR_PIN_HTML,
        iconSize: [36, 46],
        iconAnchor: [18, 44],
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
        body: JSON.stringify({ restaurant_slug: slug, lat, lng }),
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
    <div className="taapr-map-shell">
      <Label className="text-sm font-medium">Adresse de livraison</Label>

      <form onSubmit={handleSearch} className="taapr-map-search">
        <input
          type="text"
          placeholder="Rechercher une adresse…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <button type="submit" disabled={searching} aria-label="Rechercher">
          {searching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </button>
      </form>

      <div className="taapr-map h-64">
        <div ref={containerRef} className="h-full w-full" />
      </div>
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
        <div className="taapr-map-info">
          <span className="pin-dot">
            <MapPin className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0 flex-1">
            <span className="taapr-map-info-strong">
              {deliveryAddress.formatted}
            </span>
            {deliveryFee > 0 && (
              <small>
                Frais de livraison :{" "}
                <span className="font-semibold text-[#1A1410]">
                  {formatPrice(deliveryFee)}
                </span>
                {deliveryMinOrder > 0 && (
                  <>
                    {" "}
                    · Minimum{" "}
                    <span className="font-semibold text-[#1A1410]">
                      {formatPrice(deliveryMinOrder)}
                    </span>
                  </>
                )}
              </small>
            )}
          </div>
        </div>
      )}

      {outOfZone && (
        <div className="taapr-map-info taapr-map-info--alert">
          <span className="pin-dot">
            <MapPin className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0 flex-1">
            <span className="taapr-map-info-strong">Hors zone de livraison</span>
            <small>Déplacez le pin sur une zone desservie pour continuer.</small>
          </div>
        </div>
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
