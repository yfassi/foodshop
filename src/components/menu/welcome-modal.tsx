"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import type { OrderType } from "@/lib/types";
import { useCartStore } from "@/stores/cart-store";
import {
  UtensilsCrossed,
  ShoppingBag,
  Bike,
  BookOpen,
  Gift,
  ChevronRight,
  LogIn,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const ORDER_TYPE_CONFIG: Record<
  OrderType,
  { label: string; description: string; icon: LucideIcon }
> = {
  dine_in: {
    label: "Sur place",
    description: "Manger au restaurant",
    icon: UtensilsCrossed,
  },
  takeaway: {
    label: "À emporter",
    description: "Récupérer ma commande",
    icon: ShoppingBag,
  },
  delivery: {
    label: "Livraison",
    description: "Livré à mon adresse",
    icon: Bike,
  },
};

interface WelcomeModalProps {
  open: boolean;
  restaurantName: string;
  logoUrl: string | null;
  orderTypes: OrderType[];
  loyaltyEnabled: boolean;
  publicId: string;
}

export function WelcomeModal({
  open,
  restaurantName,
  logoUrl,
  orderTypes,
  loyaltyEnabled,
  publicId,
}: WelcomeModalProps) {
  const setOrderType = useCartStore((s) => s.setOrderType);
  const setBrowseMode = useCartStore((s) => s.setBrowseMode);

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const handleSelect = (type: OrderType) => {
    setOrderType(type);
  };

  const handleBrowse = () => {
    setBrowseMode(true);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Bienvenue"
      className="fixed inset-0 z-[60] flex flex-col bg-background"
    >
      {/* Subtle gradient backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,oklch(0.97_0_0)_0%,transparent_60%)]"
      />

      <div className="relative flex h-full w-full flex-col overflow-y-auto">
        {/* Hero */}
        <div className="flex flex-col items-center px-6 pt-[max(2rem,env(safe-area-inset-top))] pb-6">
          {logoUrl ? (
            <div className="mb-4 overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-border">
              <Image
                src={logoUrl}
                alt={restaurantName}
                width={72}
                height={72}
                className="h-[72px] w-[72px] object-cover"
              />
            </div>
          ) : (
            <div className="mb-4 flex h-[72px] w-[72px] items-center justify-center rounded-2xl bg-primary/10 text-3xl font-bold text-primary ring-1 ring-primary/20">
              {restaurantName.charAt(0)}
            </div>
          )}
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Bienvenue chez
          </p>
          <h1 className="text-center font-heading text-2xl font-extrabold tracking-tight">
            {restaurantName}
          </h1>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Comment souhaitez-vous commencer ?
          </p>
        </div>

        {/* Options */}
        <div className="flex flex-1 flex-col px-5 pb-6">
          <div className="mx-auto flex w-full max-w-md flex-col gap-2.5">
            {orderTypes.map((type) => {
              const config = ORDER_TYPE_CONFIG[type];
              if (!config) return null;
              const Icon = config.icon;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleSelect(type)}
                  className="group flex items-center gap-4 rounded-2xl border border-border bg-card px-4 py-4 text-left shadow-sm transition-all active:scale-[0.99] active:bg-muted/40"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-semibold leading-tight text-foreground">
                      {config.label}
                    </p>
                    <p className="mt-0.5 text-[12px] text-muted-foreground">
                      {config.description}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-active:translate-x-0.5" />
                </button>
              );
            })}

            {/* "Just view the menu" — separated visually */}
            <button
              type="button"
              onClick={handleBrowse}
              className="mt-1 flex items-center gap-4 rounded-2xl border border-dashed border-border bg-transparent px-4 py-3.5 text-left transition-all active:scale-[0.99] active:bg-muted/30"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <BookOpen className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold leading-tight text-foreground">
                  Voir le menu
                </p>
                <p className="mt-0.5 text-[12px] text-muted-foreground">
                  Parcourir sans commander
                </p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Footer — auth */}
        {loyaltyEnabled && (
          <div className="mt-auto border-t border-border bg-card/60 px-5 py-4 backdrop-blur-sm pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="mx-auto flex w-full max-w-md items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Gift className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold leading-tight">
                    Cumulez des points
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Programme fidélité actif
                  </p>
                </div>
              </div>

              <div className="flex gap-2.5">
                <Link href={`/restaurant/${publicId}/login`} className="flex-1">
                  <Button
                    className="h-12 w-full gap-2 rounded-xl font-semibold"
                    size="lg"
                  >
                    <LogIn className="h-4 w-4" />
                    Se connecter
                  </Button>
                </Link>
                <Link href={`/restaurant/${publicId}/signup`} className="flex-1">
                  <Button
                    variant="outline"
                    className="h-12 w-full gap-2 rounded-xl font-semibold"
                    size="lg"
                  >
                    <UserPlus className="h-4 w-4" />
                    S&apos;inscrire
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
