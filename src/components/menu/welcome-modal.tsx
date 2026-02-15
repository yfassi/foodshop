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
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";
import { UtensilsCrossed, ShoppingBag, Gift, LogIn, UserPlus } from "lucide-react";

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
        <DrawerHeader className="items-center pb-2">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt={restaurantName}
              width={80}
              height={80}
              className="mb-2 rounded-2xl"
            />
          ) : (
            <div className="mb-2 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-3xl font-bold text-primary">
              {restaurantName.charAt(0)}
            </div>
          )}
          <DrawerTitle className="text-xl">
            Bienvenue chez {restaurantName}
          </DrawerTitle>
          <DrawerDescription>
            {showSelector
              ? "Comment souhaitez-vous commander ?"
              : "Commandez en quelques clics"}
          </DrawerDescription>
        </DrawerHeader>

        <div className="space-y-5 px-4">
          {/* Order type selection */}
          {showSelector && (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setSelected("dine_in")}
                className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-colors ${
                  selected === "dine_in"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <UtensilsCrossed className={`h-7 w-7 ${selected === "dine_in" ? "text-primary" : "text-muted-foreground"}`} />
                <span className={`text-sm font-semibold ${selected === "dine_in" ? "text-primary" : ""}`}>
                  Sur place
                </span>
              </button>
              <button
                onClick={() => setSelected("takeaway")}
                className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-colors ${
                  selected === "takeaway"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <ShoppingBag className={`h-7 w-7 ${selected === "takeaway" ? "text-primary" : "text-muted-foreground"}`} />
                <span className={`text-sm font-semibold ${selected === "takeaway" ? "text-primary" : ""}`}>
                  À emporter
                </span>
              </button>
            </div>
          )}

          {/* Loyalty / auth prompt */}
          {loyaltyEnabled && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Gift className="h-5 w-5 text-primary" />
                <p className="text-sm font-medium">
                  Connectez-vous pour cumuler vos points fidélité
                </p>
              </div>
              <div className="flex gap-2">
                <Link href={`/${slug}/login`} className="flex-1">
                  <Button variant="outline" className="w-full gap-2 rounded-xl text-sm" size="sm">
                    <LogIn className="h-4 w-4" />
                    Se connecter
                  </Button>
                </Link>
                <Link href={`/${slug}/signup`} className="flex-1">
                  <Button variant="outline" className="w-full gap-2 rounded-xl text-sm" size="sm">
                    <UserPlus className="h-4 w-4" />
                    S&apos;inscrire
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>

        <DrawerFooter>
          <Button
            onClick={handleConfirm}
            disabled={!selected}
            className="h-12 w-full rounded-xl text-base font-semibold"
            size="lg"
          >
            Commander
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
