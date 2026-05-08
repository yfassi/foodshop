"use client";

import Image from "next/image";
import {
  MapPin,
  Phone,
  Mail,
  Instagram,
  Facebook,
  Globe,
  Music2,
  Twitter,
  Youtube,
  Linkedin,
  Clock,
  type LucideIcon,
} from "lucide-react";
import type { Restaurant, RestaurantSocialLinks } from "@/lib/types";
import {
  DAYS_FR,
  getRestaurantStatusLabel,
  normalizeHoursEntry,
} from "@/lib/constants";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";

const DAY_ORDER = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const SOCIAL_CONFIG: Record<
  keyof RestaurantSocialLinks,
  { label: string; icon: LucideIcon }
> = {
  instagram: { label: "Instagram", icon: Instagram },
  facebook: { label: "Facebook", icon: Facebook },
  tiktok: { label: "TikTok", icon: Music2 },
  twitter: { label: "Twitter / X", icon: Twitter },
  youtube: { label: "YouTube", icon: Youtube },
  linkedin: { label: "LinkedIn", icon: Linkedin },
  website: { label: "Site web", icon: Globe },
};

function getTodayKey() {
  const days = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  return days[new Date().getDay()];
}

export function RestaurantInfoDrawer({
  restaurant,
  open,
  onOpenChange,
}: {
  restaurant: Restaurant;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const status = getRestaurantStatusLabel(restaurant.opening_hours);
  const isOpen = status.isOpen && restaurant.is_accepting_orders;
  const statusLabel = restaurant.is_accepting_orders ? status.label : "Fermé";
  const todayKey = getTodayKey();

  const socials = (restaurant.social_links ?? {}) as RestaurantSocialLinks;
  const socialEntries = (
    Object.entries(socials) as [keyof RestaurantSocialLinks, string | undefined][]
  ).filter(([, v]) => v && v.trim().length > 0);

  const mapsHref = restaurant.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.address)}`
    : null;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className="px-5 pt-5 pb-2">
          <div className="flex items-center gap-3">
            {restaurant.logo_url ? (
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl">
                <Image
                  src={restaurant.logo_url}
                  alt={`${restaurant.name} logo`}
                  fill
                  className="object-cover"
                  sizes="56px"
                />
              </div>
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-muted text-lg font-bold">
                {restaurant.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <DrawerTitle className="truncate text-lg font-extrabold tracking-tight">
                {restaurant.name}
              </DrawerTitle>
              {restaurant.description ? (
                <DrawerDescription className="line-clamp-2 text-xs">
                  {restaurant.description}
                </DrawerDescription>
              ) : (
                <DrawerDescription className="sr-only">
                  Fiche du restaurant
                </DrawerDescription>
              )}
            </div>
            <span
              className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                isOpen
                  ? "bg-success-soft text-success"
                  : "bg-destructive/10 text-destructive"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isOpen ? "bg-success" : "bg-destructive"
                }`}
              />
              {statusLabel}
            </span>
          </div>
        </div>

        <div className="max-h-[70vh] space-y-5 overflow-y-auto px-5 pt-4 pb-6">
          {(restaurant.address || restaurant.phone || restaurant.email) && (
            <section className="space-y-2">
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Contact
              </h3>
              <div className="overflow-hidden rounded-2xl border border-border bg-card">
                {restaurant.address && (
                  <a
                    href={mapsHref ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-3 px-4 py-3 transition-colors active:bg-muted"
                  >
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="text-sm leading-relaxed">{restaurant.address}</span>
                  </a>
                )}
                {restaurant.phone && (
                  <>
                    {restaurant.address && <div className="h-px bg-border" />}
                    <a
                      href={`tel:${restaurant.phone.replace(/\s+/g, "")}`}
                      className="flex items-center gap-3 px-4 py-3 transition-colors active:bg-muted"
                    >
                      <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="text-sm">{restaurant.phone}</span>
                    </a>
                  </>
                )}
                {restaurant.email && (
                  <>
                    {(restaurant.address || restaurant.phone) && (
                      <div className="h-px bg-border" />
                    )}
                    <a
                      href={`mailto:${restaurant.email}`}
                      className="flex items-center gap-3 px-4 py-3 transition-colors active:bg-muted"
                    >
                      <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="break-all text-sm">{restaurant.email}</span>
                    </a>
                  </>
                )}
              </div>
            </section>
          )}

          {socialEntries.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Réseaux sociaux
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {socialEntries.map(([key, value]) => {
                  const config = SOCIAL_CONFIG[key];
                  if (!config || !value) return null;
                  const Icon = config.icon;
                  return (
                    <a
                      key={key}
                      href={value}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-medium transition-colors active:bg-muted"
                    >
                      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{config.label}</span>
                    </a>
                  );
                })}
              </div>
            </section>
          )}

          <section className="space-y-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Horaires d&apos;ouverture
            </h3>
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              {DAY_ORDER.map((dayKey, idx) => {
                const ranges = normalizeHoursEntry(
                  restaurant.opening_hours?.[dayKey]
                );
                const isToday = dayKey === todayKey;
                return (
                  <div key={dayKey}>
                    {idx > 0 && <div className="h-px bg-border" />}
                    <div
                      className={`flex items-center justify-between gap-3 px-4 py-2.5 text-sm ${
                        isToday ? "bg-muted/40" : ""
                      }`}
                    >
                      <span
                        className={`flex items-center gap-2 ${
                          isToday ? "font-semibold" : "text-foreground"
                        }`}
                      >
                        {isToday && (
                          <Clock className="h-3.5 w-3.5 text-primary" />
                        )}
                        {DAYS_FR[dayKey]}
                      </span>
                      <span
                        className={`font-mono text-xs ${
                          ranges && ranges.length > 0
                            ? "text-foreground"
                            : "text-muted-foreground"
                        }`}
                      >
                        {ranges && ranges.length > 0
                          ? ranges
                              .map((r) => `${r.open} – ${r.close}`)
                              .join(" / ")
                          : "Fermé"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
