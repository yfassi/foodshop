"use client";

import { useState, useCallback, useRef } from "react";
import type {
  ProductWithModifiers,
  ModifierGroupWithModifiers,
  CartItem,
  CartItemModifier,
} from "@/lib/types";
import { formatPrice } from "@/lib/format";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer";
import Image from "next/image";
import { Minus, Plus, Check, Star } from "lucide-react";

interface ModifierPickerProps {
  product: ProductWithModifiers;
  open: boolean;
  onClose: () => void;
  onAdd: (item: CartItem) => void;
}

export function ModifierPicker({
  product,
  open,
  onClose,
  onAdd,
}: ModifierPickerProps) {
  const [quantity, setQuantity] = useState(1);
  const [isMenu, setIsMenu] = useState(false);
  const [selections, setSelections] = useState<Record<string, string[]>>(() => {
    const initial: Record<string, string[]> = {};
    for (const group of product.modifier_groups) initial[group.id] = [];
    return initial;
  });

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollToNextGroup = useCallback((groupIndex: number) => {
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
  }, []);

  const toggleModifier = useCallback(
    (
      group: ModifierGroupWithModifiers,
      modifierId: string,
      groupIndex: number
    ) => {
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

        if (current.length >= group.max_select) return prev;

        const next = [...current, modifierId];
        if (
          next.length >= group.min_select &&
          (next.length >= group.max_select || group.min_select > 0)
        ) {
          scrollToNextGroup(groupIndex);
        }
        return { ...prev, [group.id]: next };
      });
    },
    [scrollToNextGroup]
  );

  const isValid = product.modifier_groups.every((g) => {
    const sel = selections[g.id] || [];
    return sel.length >= g.min_select && sel.length <= g.max_select;
  });

  const modifiersExtra = product.modifier_groups.reduce((sum, g) => {
    const sel = selections[g.id] || [];
    return (
      sum +
      sel.reduce((s, modId) => {
        const mod = g.modifiers.find((m) => m.id === modId);
        return s + (mod?.price_extra || 0);
      }, 0)
    );
  }, 0);

  const menuExtra = isMenu && product.menu_supplement ? product.menu_supplement : 0;
  const lineTotal = (product.price + menuExtra + modifiersExtra) * quantity;

  const handleAdd = () => {
    const cartModifiers: CartItemModifier[] = product.modifier_groups.flatMap(
      (group) => {
        const sel = selections[group.id] || [];
        return sel
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
          .filter((x): x is CartItemModifier => x !== null);
      }
    );

    const item: CartItem = {
      id: crypto.randomUUID(),
      product_id: product.id,
      product_name: product.name,
      base_price: product.price,
      quantity,
      modifiers: cartModifiers,
      line_total: lineTotal,
      is_menu: isMenu,
      menu_supplement: product.menu_supplement ?? 0,
    };

    onAdd(item);
    onClose();
  };

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="max-h-[92vh]">
        <DrawerHeader className="px-4 pb-3 pt-3">
          {product.image_url ? (
            <div className="relative mb-3 h-[140px] w-full overflow-hidden rounded-2xl bg-muted">
              <Image
                src={product.image_url}
                alt={product.name}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 400px"
              />
            </div>
          ) : null}
          <DrawerTitle className="text-[20px] font-extrabold tracking-tight">
            {product.name}
          </DrawerTitle>
          <div className="mt-1.5 flex items-center gap-2">
            <p className="font-mono text-[14px] font-bold">
              {formatPrice(product.price)}
            </p>
          </div>
        </DrawerHeader>

        {product.menu_supplement !== null &&
          product.menu_supplement !== undefined && (
            <div className="border-b border-border px-4 py-3">
              <div className="mb-2 flex items-center gap-1.5">
                <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-warning">
                  Formule menu
                </span>
              </div>
              <button
                onClick={() => setIsMenu(!isMenu)}
                className={`flex w-full items-center justify-between rounded-xl border-[1.5px] px-4 py-3 text-left transition-colors ${
                  isMenu
                    ? "border-foreground bg-foreground/[0.03]"
                    : "border-border bg-muted/30"
                }`}
              >
                <span className="text-[13px] font-bold">Ajouter le menu</span>
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

        <div
          ref={scrollContainerRef}
          className="min-h-0 flex-1 overflow-y-auto px-4 py-4"
        >
          {product.modifier_groups.map((group, groupIndex) => {
            const selected = selections[group.id] || [];
            const isRequired = group.min_select > 0;
            return (
              <div
                key={group.id}
                data-group-index={groupIndex}
                className="mb-5"
              >
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
                          onClick={() =>
                            toggleModifier(group, modifier.id, groupIndex)
                          }
                          disabled={isDisabled}
                          className={`flex items-center gap-3 border-b border-border/60 py-3 text-left transition-colors last:border-b-0 ${
                            isDisabled
                              ? "cursor-not-allowed opacity-40"
                              : "active:bg-accent/30"
                          }`}
                        >
                          <span
                            className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border-[2px] transition-colors ${
                              isSelected
                                ? "border-foreground bg-foreground text-background"
                                : "border-border"
                            }`}
                          >
                            {isSelected && (
                              <Check className="h-3 w-3" strokeWidth={3} />
                            )}
                          </span>
                          <span className="flex-1 text-[14px]">
                            {modifier.name}
                          </span>
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
            <div className="inline-flex items-center overflow-hidden rounded-xl bg-muted">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                aria-label="Diminuer la quantite"
                className="grid h-12 w-10 place-items-center transition-colors active:bg-border"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-8 text-center font-mono text-[14px] font-bold">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                aria-label="Augmenter la quantite"
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
    </Drawer>
  );
}
