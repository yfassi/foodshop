"use client";

import { useState } from "react";
import type { ProductWithModifiers } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import { ModifierModal } from "./modifier-modal";
import { useCartStore } from "@/stores/cart-store";
import Image from "next/image";
import { Plus } from "lucide-react";
import { toast } from "sonner";

function hasRequiredModifiers(product: ProductWithModifiers) {
  return product.modifier_groups.some((g) => g.min_select > 0);
}

export function ProductCard({ product }: { product: ProductWithModifiers }) {
  const [showModal, setShowModal] = useState(false);
  const addItem = useCartStore((s) => s.addItem);

  const isUnavailable = !product.is_available;
  const requiresChoice = hasRequiredModifiers(product);

  const openModal = () => {
    if (isUnavailable) return;
    setShowModal(true);
  };

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isUnavailable) return;
    if (requiresChoice) {
      setShowModal(true);
      return;
    }
    addItem({
      product_id: product.id,
      product_name: product.name,
      base_price: product.price,
      quantity: 1,
      modifiers: [],
      is_menu: false,
      menu_supplement: product.menu_supplement ?? 0,
    });
    toast.success(`${product.name} ajouté au panier`);
  };

  return (
    <>
      {/* Product row — kit: horizontal, dashed bottom border */}
      <div
        role="button"
        tabIndex={isUnavailable ? -1 : 0}
        aria-disabled={isUnavailable}
        onClick={openModal}
        onKeyDown={(e) => {
          if (isUnavailable) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openModal();
          }
        }}
        className={`group flex w-full items-start gap-3.5 border-b border-dashed border-[#dbd7d2] py-3.5 text-left last:border-b-0 ${
          isUnavailable
            ? "pointer-events-none opacity-45"
            : "cursor-pointer active:opacity-75"
        }`}
      >
        {/* Thumbnail — kit: 80×80, radius 14px */}
        {product.image_url ? (
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[14px] bg-[#fdf9f3]">
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              className="object-cover"
              sizes="80px"
            />
            {isUnavailable && (
              <div className="absolute inset-0 grid place-items-center rounded-[14px] bg-black/50 text-[9px] font-bold uppercase tracking-[0.08em] text-white">
                Indispo.
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[14px] bg-[#fdf9f3]">
            {isUnavailable ? (
              <span className="text-[9px] font-bold uppercase tracking-wider text-[#a89e94]">Indispo.</span>
            ) : (
              <Plus className="h-5 w-5 text-[#d7352d]/25" />
            )}
          </div>
        )}

        {/* Body */}
        <div className="flex min-w-0 flex-1 flex-col">
          <h3 className={`text-[15px] font-bold leading-tight tracking-[-0.015em] ${isUnavailable ? "text-[#a89e94]" : "text-[#1c1410]"}`}>
            {product.name}
          </h3>
          {product.description && (
            <p className="mt-1 line-clamp-2 text-[12.5px] leading-snug text-[#68625e]">
              {product.description}
            </p>
          )}
          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <p className={`font-mono text-[14px] font-bold ${isUnavailable ? "text-[#a89e94]" : "text-[#1c1410]"}`}>
                {formatPrice(product.price)}
              </p>
              {product.menu_supplement != null && (
                <span className="truncate rounded-full bg-[#fdebc8] px-1.5 py-0.5 text-[10px] font-semibold text-[#b75000]">
                  Menu +{formatPrice(product.menu_supplement)}
                </span>
              )}
            </div>
            {/* Quick add button — tomato red circle per kit */}
            {!isUnavailable && (
              <button
                type="button"
                onClick={handleQuickAdd}
                aria-label={`Ajouter ${product.name} au panier`}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#d7352d] text-white shadow-[0_0_12px_#d7352d4d] transition-transform active:scale-90"
              >
                <Plus className="h-[18px] w-[18px]" strokeWidth={2.5} />
              </button>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <ModifierModal
          product={product}
          open={showModal}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
