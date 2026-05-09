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

export function ProductCardSmall({ product }: { product: ProductWithModifiers }) {
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
        className={`relative flex shrink-0 flex-col overflow-hidden rounded-[14px] border border-[#dbd7d2] bg-white text-left transition-colors ${
          isUnavailable ? "cursor-not-allowed opacity-50" : "cursor-pointer active:opacity-75"
        }`}
        style={{ width: "164px" }}
      >
        {/* Thumbnail */}
        {product.image_url ? (
          <div className="relative h-28 w-full">
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              className={`object-cover ${isUnavailable ? "grayscale" : ""}`}
              sizes="164px"
            />
          </div>
        ) : (
          <div className="flex h-28 w-full items-center justify-center bg-gradient-to-br from-[#fdf2e8] to-[#f8e6d3]">
            <Plus className="h-7 w-7 text-[#d7352d]/30" />
          </div>
        )}
        {/* Indispo overlay badge */}
        {isUnavailable && (
          <div className="absolute left-2 top-2 rounded-full bg-[#68625e]/80 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
            Indispo.
          </div>
        )}
        {/* Body */}
        <div className="px-3.5 pb-3 pt-2.5">
          <p className={`truncate text-[14px] font-bold leading-tight tracking-[-0.015em] ${isUnavailable ? "text-[#a89e94]" : "text-[#1c1410]"}`}>
            {product.name}
          </p>
          {product.description && (
            <p className="mt-0.5 line-clamp-1 text-[11.5px] text-[#68625e]">
              {product.description}
            </p>
          )}
          <div className="mt-2 flex items-center justify-between">
            <span className={`font-mono text-[14px] font-bold ${isUnavailable ? "text-[#a89e94]" : "text-[#1c1410]"}`}>
              {formatPrice(product.price)}
            </span>
            {!isUnavailable && (
              <button
                type="button"
                onClick={handleQuickAdd}
                aria-label={`Ajouter ${product.name} au panier`}
                className="grid h-9 w-9 place-items-center rounded-full bg-[#d7352d] text-white shadow-[0_0_12px_#d7352d4d] transition-transform active:scale-90"
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
