"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { OrderType } from "@/lib/types";
import { useCartStore } from "@/stores/cart-store";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  UtensilsCrossed,
  ShoppingBag,
  Gift,
  LogIn,
  UserPlus,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";

const ORDER_TYPE_CONFIG: Record<
  OrderType,
  { label: string; description: string; icon: LucideIcon }
> = {
  dine_in: {
    label: "Sur place",
    description: "Mangez au restaurant",
    icon: UtensilsCrossed,
  },
  takeaway: {
    label: "À emporter",
    description: "Récupérez votre commande",
    icon: ShoppingBag,
  },
};

interface WelcomeModalProps {
  open: boolean;
  restaurantName: string;
  logoUrl: string | null;
  orderTypes: OrderType[];
  loyaltyEnabled: boolean;
  slug: string;
}

export function WelcomeModal({
  open,
  restaurantName,
  logoUrl,
  orderTypes,
  loyaltyEnabled,
  slug,
}: WelcomeModalProps) {
  const setOrderType = useCartStore((s) => s.setOrderType);
  const showSelector = orderTypes.length > 1;
  const [selected, setSelected] = useState<OrderType | null>(
    showSelector ? null : orderTypes[0] ?? "dine_in"
  );

  const handleConfirm = () => {
    if (selected) {
      setOrderType(selected);
    }
  };

  return (
    <Drawer open={open} dismissible={false}>
      <DrawerContent>
        <DrawerTitle className="sr-only">Bienvenue</DrawerTitle>
        {/* Hero header */}
        <div className="flex flex-col items-center px-6 pt-6 pb-2">
          {logoUrl ? (
            <div className="mb-4 rounded-2xl bg-primary/5 p-2 shadow-sm ring-1 ring-border">
              <Image
                src={logoUrl}
                alt={restaurantName}
                width={72}
                height={72}
                className="rounded-xl"
              />
            </div>
          ) : (
            <div className="mb-4 flex h-[88px] w-[88px] items-center justify-center rounded-2xl bg-primary/10 text-3xl font-bold text-primary shadow-sm ring-1 ring-primary/20">
              {restaurantName.charAt(0)}
            </div>
          )}
          <h2 className="text-center font-heading text-xl font-bold tracking-tight">
            {restaurantName}
          </h2>
          {showSelector && (
            <p className="mt-1 text-sm text-muted-foreground">
              Comment souhaitez-vous commander ?
            </p>
          )}
        </div>

        <div className="space-y-4 px-5 pt-4 pb-2">
          {/* Order type selection */}
          {showSelector && (
            <div className="grid grid-cols-2 gap-3">
              {orderTypes.map((type) => {
                const config = ORDER_TYPE_CONFIG[type];
                if (!config) return null;
                const Icon = config.icon;
                const isSelected = selected === type;
                return (
                  <button
                    key={type}
                    onClick={() => setSelected(type)}
                    className={`relative flex flex-col items-center gap-2.5 rounded-2xl border-2 p-5 transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-transparent bg-muted/60 active:scale-[0.97]"
                    }`}
                  >
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-xl transition-colors ${
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "bg-background text-muted-foreground shadow-sm ring-1 ring-border"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="text-center">
                      <span
                        className={`block text-sm font-semibold ${isSelected ? "text-primary" : "text-foreground"}`}
                      >
                        {config.label}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-muted-foreground">
                        {config.description}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Loyalty / auth section */}
          {loyaltyEnabled && (
            <>
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Gift className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-medium">Programme fidélité</span>
                </div>
                <div className="h-px flex-1 bg-border" />
              </div>

              <div className="flex gap-2.5">
                <Link href={`/${slug}/login`} className="flex-1">
                  <Button
                    className="h-12 w-full gap-2 rounded-xl font-semibold"
                    size="lg"
                  >
                    <LogIn className="h-4 w-4" />
                    Se connecter
                  </Button>
                </Link>
                <Link href={`/${slug}/signup`} className="flex-1">
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
            </>
          )}
        </div>

        <DrawerFooter className="px-5 pt-3 pb-5">
          <Button
            onClick={handleConfirm}
            disabled={!selected}
            variant={loyaltyEnabled ? "ghost" : "default"}
            className={`w-full rounded-xl font-bold ${
              loyaltyEnabled
                ? "h-11 text-sm text-muted-foreground hover:text-foreground"
                : "h-14 text-base"
            }`}
            size="lg"
          >
            {loyaltyEnabled ? (
              <>
                Continuer sans compte
                <ChevronRight className="h-4 w-4" />
              </>
            ) : (
              "Commander"
            )}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
