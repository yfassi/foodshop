"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { DeliveryCoords } from "@/lib/types";
import "leaflet/dist/leaflet.css";

type Leaflet = typeof import("leaflet");

export function DeliveryMapPicker({
  value,
  defaultAddress,
  onChange,
}: {
  value: DeliveryCoords | null;
  defaultAddress?: string | null;
  onChange: (coords: DeliveryCoords) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markerRef = useRef<import("leaflet").Marker | null>(null);
  const circleRef = useRef<import("leaflet").Circle | null>(null);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default as Leaflet;
      if (cancelled || !containerRef.current || mapRef.current) return;

      const initial = value || { lat: 48.8566, lng: 2.3522 };

      const map = L.map(containerRef.current, {
        center: [initial.lat, initial.lng],
        zoom: value ? 15 : 13,
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
      });

      const marker = L.marker([initial.lat, initial.lng], {
        draggable: true,
        icon,
      }).addTo(map);
      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        onChange({ lat: pos.lat, lng: pos.lng });
      });

      map.on("click", (e) => {
        marker.setLatLng(e.latlng);
        onChange({ lat: e.latlng.lat, lng: e.latlng.lng });
      });

      mapRef.current = map;
      markerRef.current = marker;

      if (!value && defaultAddress) {
        setQuery(defaultAddress);
        geocodeAndMove(defaultAddress, L, map, marker);
      }
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
        circleRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mapRef.current || !markerRef.current || !value) return;
    markerRef.current.setLatLng([value.lat, value.lng]);
    mapRef.current.setView([value.lat, value.lng], 15);
  }, [value]);

  const geocodeAndMove = async (
    q: string,
    L?: Leaflet,
    mapArg?: import("leaflet").Map,
    markerArg?: import("leaflet").Marker
  ) => {
    if (!q.trim()) return;
    const map = mapArg || mapRef.current;
    const marker = markerArg || markerRef.current;
    if (!map || !marker) return;
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}&countrycodes=fr`,
        { headers: { "Accept-Language": "fr" } }
      );
      const data = await res.json();
      if (!data?.length) return;
      const lat = parseFloat(data[0].lat);
      const lng = parseFloat(data[0].lon);
      marker.setLatLng([lat, lng]);
      map.setView([lat, lng], 15);
      onChange({ lat, lng });
    } catch {
      // ignore
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearching(true);
    await geocodeAndMove(query);
    setSearching(false);
  };

  return (
    <div className="space-y-3">
      <Label className="text-xs">Position du restaurant</Label>
      <form onSubmit={handleSearch} className="flex gap-2">
        <Input
          placeholder="Rechercher l'adresse du restaurant…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 h-9 text-sm"
        />
        <Button
          type="submit"
          disabled={searching}
          variant="outline"
          size="icon"
          className="h-9 w-9"
        >
          {searching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </Button>
      </form>
      <div
        ref={containerRef}
        className="h-60 w-full overflow-hidden rounded-xl border border-border"
      />
      {value && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3 text-primary" />
          {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
        </p>
      )}
    </div>
  );
}
