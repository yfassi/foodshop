"use client";

import { useState, useCallback } from "react";
import type { ProductWithModifiers, ModifierGroupWithModifiers } from "@/lib/types";
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
import Image from "next/image";
import { Minus, Plus, Check } from "lucide-react";
import { toast } from "sonner";

interface ModifierModalProps {
  product: ProductWithModifiers;
  open: boolean;
  onClose: () => void;
}

export function ModifierModal({ product, open, onClose }: ModifierModalProps) {
  const addItem = useCartStore((s) => s.addItem);
  const [quantity, setQuantity] = useState(1);
  // Track selected modifier IDs per group
  const [selections, setSelections] = useState<Record<string, string[]>>(() => {
    const initial: Record<string, string[]> = {};
    for (const group of product.modifier_groups) {
      initial[group.id] = [];
    }
    return initial;
  });

  const toggleModifier = useCallback(
    (group: ModifierGroupWithModifiers, modifierId: string) => {
      setSelections((prev) => {
        const current = prev[group.id] || [];

        if (group.max_select === 1) {
          // Radio behavior: select one
          return { ...prev, [group.id]: [modifierId] };
        }

        // Checkbox behavior
        if (current.includes(modifierId)) {
          return {
            ...prev,
            [group.id]: current.filter((id) => id !== modifierId),
          };
        }

        // Check max limit
        if (current.length >= group.max_select) {
          return prev;
        }

        return { ...prev, [group.id]: [...current, modifierId] };
      });
    },
    []
  );

  // Validation
  const isValid = product.modifier_groups.every((group) => {
    const selected = selections[group.id] || [];
    return selected.length >= group.min_select && selected.length <= group.max_select;
  });

  // Compute total
  const modifiersExtra = product.modifier_groups.reduce((sum, group) => {
    const selected = selections[group.id] || [];
    return (
      sum +
      selected.reduce((s, modId) => {
        const mod = group.modifiers.find((m) => m.id === modId);
        return s + (mod?.price_extra || 0);
      }, 0)
    );
  }, 0);

  const lineTotal = (product.price + modifiersExtra) * quantity;

  const handleAdd = () => {
    const cartModifiers = product.modifier_groups.flatMap((group) => {
      const selected = selections[group.id] || [];
      return selected
        .map((modId) => {
          const mod = group.modifiers.find((m) => m.id === modId);
          if (!mod) return null;
          return {
            group_id: group.id,
            group_name: group.name,
            modifier_id: mod.id,
            modifier_name: mod.name,
            price_extra: mod.price_extra,
          };
        })
        .filter(Boolean) as {
        group_id: string;
        group_name: string;
        modifier_id: string;
        modifier_name: string;
        price_extra: number;
      }[];
    });

    addItem({
      product_id: product.id,
      product_name: product.name,
      base_price: product.price,
      quantity,
      modifiers: cartModifiers,
    });

    toast.success(`${product.name} ajout\u00E9 au panier`);
    onClose();
  };

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="border-b border-border pb-3">
          {product.image_url && (
            <div className="relative mx-auto mb-3 h-40 w-full overflow-hidden rounded-lg">
              <Image
                src={product.image_url}
                alt={product.name}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 400px"
              />
            </div>
          )}
          <DrawerTitle className="text-lg font-bold">
            {product.name}
          </DrawerTitle>
          {product.description && (
            <p className="text-sm text-muted-foreground">
              {product.description}
            </p>
          )}
          <p className="text-sm font-semibold text-primary">{formatPrice(product.price)}</p>
        </DrawerHeader>

        <div className="overflow-y-auto px-4 py-4">
          {product.modifier_groups.map((group) => {
            const selected = selections[group.id] || [];
            const isRequired = group.min_select > 0;

            return (
              <div key={group.id} className="mb-5">
                <div className="mb-2.5 flex items-baseline justify-between">
                  <h4 className="text-sm font-semibold">
                    {group.name}
                    {isRequired && (
                      <span className="ml-2 text-xs font-normal text-primary">
                        (obligatoire)
                      </span>
                    )}
                  </h4>
                  {group.max_select > 1 && (
                    <span className="text-xs text-muted-foreground">
                      {selected.length}/{group.max_select}
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  {group.modifiers
                    .filter((m) => m.is_available)
                    .map((modifier) => {
                      const isSelected = selected.includes(modifier.id);
                      const isDisabled =
                        !isSelected && selected.length >= group.max_select;

                      return (
                        <button
                          key={modifier.id}
                          onClick={() => toggleModifier(group, modifier.id)}
                          disabled={isDisabled}
                          className={`flex items-center justify-between rounded-lg border px-3.5 py-3 text-left text-sm transition-all ${
                            isSelected
                              ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary"
                              : "border-border hover:border-primary/50 hover:bg-accent"
                          } ${isDisabled ? "cursor-not-allowed opacity-40" : ""}`}
                        >
                          <span className="font-medium">{modifier.name}</span>
                          <span className="flex items-center gap-2">
                            {modifier.price_extra > 0 && (
                              <span className="text-xs text-muted-foreground">
                                +{formatPrice(modifier.price_extra)}
                              </span>
                            )}
                            {isSelected && <Check className="h-4 w-4 text-primary" />}
                          </span>
                        </button>
                      );
                    })}
                </div>
              </div>
            );
          })}
        </div>

        <DrawerFooter className="border-t border-border pt-3">
          {/* Quantity selector */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-lg font-medium transition-colors hover:bg-accent"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="min-w-[2rem] text-center text-lg font-bold">
              {quantity}
            </span>
            <button
              onClick={() => setQuantity(quantity + 1)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-lg font-medium transition-colors hover:bg-accent"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <Button
            onClick={handleAdd}
            disabled={!isValid}
            className="h-14 w-full rounded-xl text-base font-bold"
            size="lg"
          >
            Ajouter au panier &mdash; {formatPrice(lineTotal)}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
