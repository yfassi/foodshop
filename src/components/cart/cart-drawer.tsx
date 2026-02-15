"use client";

import { useRouter } from "next/navigation";
import { useCartStore } from "@/stores/cart-store";
import { formatPrice } from "@/lib/format";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { CartItem } from "./cart-item";
import { CartSuggestions } from "./cart-suggestions";
import { Trash2, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import type { CategoryWithProducts } from "@/lib/types";

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
  slug: string;
  disabled?: boolean;
  categories?: CategoryWithProducts[];
}

export function CartDrawer({ open, onClose, slug, disabled, categories }: CartDrawerProps) {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const totalPrice = useCartStore((s) => s.totalPrice);
  const clearCart = useCartStore((s) => s.clearCart);

  const handleCheckout = () => {
    onClose();
    router.push(`/${slug}/checkout`);
  };

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="flex items-center justify-between border-b border-border pb-3">
          <DrawerTitle className="text-lg font-bold">
            Mon panier
          </DrawerTitle>
          {items.length > 0 && (
            <button
              onClick={() => {
                toast("Vider le panier ?", {
                  action: {
                    label: "Confirmer",
                    onClick: () => clearCart(),
                  },
                });
              }}
              className="flex items-center gap-1 text-xs font-medium text-destructive hover:underline"
            >
              <Trash2 className="h-3 w-3" />
              Vider
            </button>
          )}
        </DrawerHeader>

        <div className="overflow-y-auto px-4">
          {items.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Votre panier est vide.
            </p>
          ) : (
            <>
              {items.map((item) => <CartItem key={item.id} item={item} />)}

              {/* Suggestions */}
              {categories && categories.length > 0 && (
                <CartSuggestions categories={categories} />
              )}
            </>
          )}
        </div>

        {items.length > 0 && (
          <DrawerFooter className="border-t border-border pt-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Total</span>
              <span className="text-lg font-bold">
                {formatPrice(totalPrice())}
              </span>
            </div>
            <Button
              onClick={handleCheckout}
              disabled={disabled}
              className="h-14 w-full rounded-xl text-base font-bold"
              size="lg"
            >
              {disabled
                ? "Commandes fermees"
                : `Commander \u2014 ${formatPrice(totalPrice())}`}
            </Button>
            <button
              onClick={onClose}
              className="flex w-full items-center justify-center gap-1 py-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Continuer mes achats
            </button>
          </DrawerFooter>
        )}
      </DrawerContent>
    </Drawer>
  );
}
