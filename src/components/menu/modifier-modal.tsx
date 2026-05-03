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
import Image from "next/image";
import { Minus, Plus, Check, Star, X } from "lucide-react";
import { toast } from "sonner";

interface ModifierModalProps {
  product: ProductWithModifiers;
  open: boolean;
  onClose: () => void;
}

const SNAP_POINTS = [0.7, 1] as const;

export function ModifierModal({ product, open, onClose }: ModifierModalProps) {
  const addItem = useCartStore((s) => s.addItem);
  const [quantity, setQuantity] = useState(1);
  const [isMenu, setIsMenu] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const [snap, setSnap] = useState<number | string | null>(SNAP_POINTS[0]);
  const isFullscreen = snap === 1;
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
            return { ...prev, [group.id]: [] };
          }
          scrollToNextGroup(groupIndex);
          return { ...prev, [group.id]: [modifierId] };
        }

        if (current.includes(modifierId)) {
          return {
            ...prev,
            [group.id]: current.filter((id) => id !== modifierId),
          };
        }

        if (current.length >= group.max_select) {
          return prev;
        }

        const newSelected = [...current, modifierId];
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

  const isValid = product.modifier_groups.every((group) => {
    const selected = selections[group.id] || [];
    return selected.length >= group.min_select && selected.length <= group.max_select;
  });

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

    toast.success(`${product.name} ajouté au panier`);
    onClose();
  };

  return (
    <Drawer
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          setSnap(SNAP_POINTS[0]);
          onClose();
        }
      }}
      snapPoints={[...SNAP_POINTS]}
      activeSnapPoint={snap}
      setActiveSnapPoint={setSnap}
    >
      <DrawerContent
        className={`h-[100dvh] max-h-[100dvh] data-[vaul-drawer-direction=bottom]:max-h-[100dvh] transition-[border-radius] duration-200 ease-out ${
          isFullscreen
            ? "data-[vaul-drawer-direction=bottom]:rounded-t-none"
            : ""
        }`}
      >
        <DrawerHeader className="px-4 pb-3 pt-3">
          {product.image_url ? (
            <button
              type="button"
              onClick={() => setShowLightbox(true)}
              className="relative mb-3 h-[180px] w-full cursor-zoom-in overflow-hidden rounded-2xl bg-muted"
            >
              <Image
                src={product.image_url}
                alt={product.name}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 400px"
              />
            </button>
          ) : (
            <div className="mb-3 grid h-[180px] w-full place-items-center rounded-2xl bg-gradient-to-br from-orange-50 to-orange-100 text-6xl">
              🍽
            </div>
          )}
          <DrawerTitle className="text-[22px] font-extrabold tracking-tight">
            {product.name}
          </DrawerTitle>
          {product.description && (
            <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
              {product.description}
            </p>
          )}
          <div className="mt-2.5 flex items-center gap-2">
            <p className="font-mono text-[15px] font-bold">{formatPrice(product.price)}</p>
          </div>
        </DrawerHeader>

        {product.menu_supplement !== null && product.menu_supplement !== undefined && (
          <div className="border-b border-border px-4 py-3">
            <div className="mb-2 flex items-center gap-1.5">
              <Star className="h-3.5 w-3.5 fill-warning text-warning" />
              <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-warning">
                Offre recommandée
              </span>
            </div>
            <button
              onClick={() => setIsMenu(!isMenu)}
              className={`flex w-full items-center justify-between rounded-xl border-[1.5px] px-4 py-3.5 text-left transition-colors ${
                isMenu
                  ? "border-foreground bg-foreground/[0.03]"
                  : "border-border bg-muted/30 active:bg-muted/60"
              }`}
            >
              <div className="flex-1">
                <p className="text-[13px] font-bold">Formule Menu</p>
                {product.menu_description && (
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {product.menu_description}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[13px] font-bold">
                  +{formatPrice(product.menu_supplement)}
                </span>
                {isMenu && (
                  <span className="grid h-5 w-5 place-items-center rounded-md bg-foreground text-background">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                )}
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
                  <h4 className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                    {group.name}
                    {isRequired && (
                      <span className="ml-2 text-[10px] font-bold text-destructive">
                        · obligatoire
                      </span>
                    )}
                  </h4>
                  {group.max_select > 1 && (
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {selected.length}/{group.max_select}
                    </span>
                  )}
                </div>
                <div className="flex flex-col">
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
                          className={`flex items-center gap-3 border-b border-border/60 py-3 text-left transition-colors last:border-b-0 ${
                            isDisabled ? "cursor-not-allowed opacity-40" : "active:bg-accent/30"
                          }`}
                        >
                          <span
                            className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border-[2px] transition-colors ${
                              isSelected
                                ? "border-foreground bg-foreground text-background"
                                : "border-border"
                            }`}
                          >
                            {isSelected && <Check className="h-3 w-3" strokeWidth={3} />}
                          </span>
                          <span className="flex-1 text-[14px]">{modifier.name}</span>
                          {modifier.price_extra > 0 && (
                            <span className="font-mono text-[13px] text-muted-foreground">
                              +{formatPrice(modifier.price_extra)}
                            </span>
                          )}
                        </button>
                      );
                    })}
                </div>
              </div>
            );
          })}
        </div>

        <DrawerFooter className="border-t border-border px-4 pt-3">
          <div className="flex items-center gap-3">
            {/* Stepper matching design */}
            <div className="inline-flex items-center overflow-hidden rounded-xl bg-muted">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                aria-label="Diminuer la quantité"
                className="grid h-12 w-10 place-items-center transition-colors active:bg-border"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-8 text-center font-mono text-[14px] font-bold">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                aria-label="Augmenter la quantité"
                className="grid h-12 w-10 place-items-center transition-colors active:bg-border"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <button
              onClick={handleAdd}
              disabled={!isValid}
              className="flex h-12 flex-1 items-center justify-center rounded-xl bg-primary px-4 text-[14px] font-semibold text-primary-foreground transition-colors active:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Ajouter · {formatPrice(lineTotal)}
            </button>
          </div>
        </DrawerFooter>
      </DrawerContent>

      {showLightbox && product.image_url && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4"
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
