"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, Search, Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import type { DeliveryCoords } from "@/lib/types";
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
        zoomControl: true,
        attributionControl: true,
      });

      // CARTO Voyager — free, no API key, warm tones aligned with the cream palette.
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
    <div className="taapr-map-shell">
      <Label className="text-xs">Position du restaurant</Label>
      <form onSubmit={handleSearch} className="taapr-map-search">
        <input
          type="text"
          placeholder="Rechercher l'adresse du restaurant…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit" disabled={searching} aria-label="Rechercher">
          {searching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </button>
      </form>
      <div className="taapr-map h-60">
        <div ref={containerRef} className="h-full w-full" />
      </div>
      {value && (
        <div className="taapr-map-info">
          <span className="pin-dot">
            <MapPin className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0 flex-1">
            <span className="taapr-map-info-strong">
              Position confirmée
            </span>
            <small>
              {value.lat.toFixed(5)}, {value.lng.toFixed(5)} · glissez le pin pour
              ajuster
            </small>
          </div>
        </div>
      )}
    </div>
  );
}
