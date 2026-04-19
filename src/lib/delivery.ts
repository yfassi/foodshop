import type { DeliveryConfig, DeliveryCoords, DeliveryZone } from "./types";

/** Haversine distance in meters between two geographic points. */
export function haversineMeters(a: DeliveryCoords, b: DeliveryCoords): number {
  const R = 6_371_000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
  return R * c;
}

export interface ZoneMatch {
  zone: DeliveryZone;
  distance_m: number;
}

/**
 * Given a delivery config and a customer point, return the smallest zone whose
 * radius contains the point. Returns null if outside max_radius_m or no zones
 * match. Zones are sorted ascending by radius so the cheapest matching zone wins.
 */
export function matchZone(
  config: DeliveryConfig,
  point: DeliveryCoords
): ZoneMatch | null {
  if (!config.coords || !config.zones || config.zones.length === 0) return null;
  const distance = haversineMeters(config.coords, point);
  if (config.max_radius_m && distance > config.max_radius_m) return null;

  const sorted = [...config.zones].sort((a, b) => a.radius_m - b.radius_m);
  for (const zone of sorted) {
    if (distance <= zone.radius_m) return { zone, distance_m: Math.round(distance) };
  }
  return null;
}

/** Format meters for display. */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}
