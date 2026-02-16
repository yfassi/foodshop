"use client";

import { useState, useCallback, useRef } from "react";
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
import { Minus, Plus, Check, Star, X } from "lucide-react";
import { toast } from "sonner";

interface ModifierModalProps {
  product: ProductWithModifiers;
  open: boolean;
  onClose: () => void;
}

export function ModifierModal({ product, open, onClose }: ModifierModalProps) {
  const addItem = useCartStore((s) => s.addItem);
  const [quantity, setQuantity] = useState(1);
  const [isMenu, setIsMenu] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  // Track selected modifier IDs per group
  const [selections, setSelections] = useState<Record<string, string[]>>(() => {
    const initial: Record<string, string[]> = {};
    for (const group of product.modifier_groups) {
      initial[group.id] = [];
    }
    return initial;
  });

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollToNextGroup = useCallback(
    (groupIndex: number) => {
      const container = scrollContainerRef.current;
      if (!container) return;
      const nextEl = container.querySelector(
        `[data-group-index="${groupIndex + 1}"]`
      );
      if (nextEl) {
        setTimeout(() => {
          nextEl.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 150);
      }
    },
    []
  );

  const toggleModifier = useCallback(
    (group: ModifierGroupWithModifiers, modifierId: string, groupIndex: number) => {
      setSelections((prev) => {
        const current = prev[group.id] || [];

        if (group.max_select === 1) {
          if (current.includes(modifierId)) {
            // Deselect if already selected
            return { ...prev, [group.id]: [] };
          }
          // Select and scroll to next
          scrollToNextGroup(groupIndex);
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

        const newSelected = [...current, modifierId];
        // Scroll if we just reached min_select or max_select
        if (
          newSelected.length >= group.min_select &&
          (newSelected.length >= group.max_select || group.min_select > 0)
        ) {
          scrollToNextGroup(groupIndex);
        }

        return { ...prev, [group.id]: newSelected };
      });
    },
    [scrollToNextGroup]
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

  const menuExtra = isMenu && product.menu_supplement ? product.menu_supplement : 0;
  const lineTotal = (product.price + menuExtra + modifiersExtra) * quantity;

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
      is_menu: isMenu,
      menu_supplement: product.menu_supplement ?? 0,
    });

    toast.success(`${product.name} ajout\u00E9 au panier`);
    onClose();
  };

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="max-h-[92vh]">
        <DrawerHeader className="pb-3">
          {product.image_url && (
            <button
              type="button"
              onClick={() => setShowLightbox(true)}
              className="relative mx-auto mb-3 h-40 w-full overflow-hidden rounded-lg cursor-zoom-in"
            >
              <Image
                src={product.image_url}
                alt={product.name}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 400px"
              />
            </button>
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

        {product.menu_supplement !== null && product.menu_supplement !== undefined && (
          <div className="border-b border-border px-4 py-3">
            <div className="mb-2 flex items-center gap-1.5">
              <Star className="h-3.5 w-3.5 fill-primary text-primary" />
              <span className="text-xs font-semibold text-primary">Offre recommandée</span>
            </div>
            <button
              onClick={() => setIsMenu(!isMenu)}
              className={`flex w-full items-center justify-between rounded-xl border px-4 py-3.5 text-left transition-colors ${
                isMenu
                  ? "border-primary bg-primary/5"
                  : "border-border bg-muted/30 active:bg-muted/50"
              }`}
            >
              <div className="flex-1">
                <p className="text-sm font-semibold">Formule Menu</p>
                {product.menu_description && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {product.menu_description}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-primary">
                  +{formatPrice(product.menu_supplement)}
                </span>
                {isMenu && <Check className="h-4 w-4 text-primary" />}
              </div>
            </button>
          </div>
        )}

        <div ref={scrollContainerRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {product.modifier_groups.map((group, groupIndex) => {
            const selected = selections[group.id] || [];
            const isRequired = group.min_select > 0;

            return (
              <div key={group.id} data-group-index={groupIndex} className="mb-5">
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
                          onClick={() => toggleModifier(group, modifier.id, groupIndex)}
                          disabled={isDisabled}
                          className={`flex items-center justify-between rounded-lg border px-3.5 py-3 text-left text-sm transition-colors ${
                            isSelected
                              ? "border-primary bg-primary/5 text-foreground"
                              : "border-border active:bg-accent"
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
              aria-label="Diminuer la quantité"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-lg font-medium transition-colors active:bg-muted/70"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="min-w-[2rem] text-center text-lg font-bold">
              {quantity}
            </span>
            <button
              onClick={() => setQuantity(quantity + 1)}
              aria-label="Augmenter la quantité"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-lg font-medium transition-colors active:bg-muted/70"
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

      {showLightbox && product.image_url && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setShowLightbox(false)}
        >
          <button
            onClick={() => setShowLightbox(false)}
            aria-label="Fermer l'image"
            className="absolute top-4 right-4 z-[101] flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="relative h-full max-h-[80vh] w-full max-w-lg">
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              className="object-contain"
              sizes="(max-width: 640px) 100vw, 512px"
              priority
            />
          </div>
        </div>
      )}
    </Drawer>
  );
}
