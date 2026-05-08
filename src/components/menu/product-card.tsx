"use client";

import { useState } from "react";
import type { ProductWithModifiers } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import { ModifierModal } from "./modifier-modal";
import Image from "next/image";
import { Plus } from "lucide-react";

export function ProductCard({ product }: { product: ProductWithModifiers }) {
  const [showModal, setShowModal] = useState(false);

  const handleClick = () => {
    if (!product.is_available) return;
    setShowModal(true);
  };

  const isUnavailable = !product.is_available;

  return (
    <>
      {/* Product row — kit: horizontal, dashed bottom border, 12px gap */}
      <button
        onClick={handleClick}
        disabled={isUnavailable}
        className={`group flex w-full items-start gap-3 border-b border-dashed border-[#dbd7d2] py-3 text-left last:border-b-0 disabled:cursor-not-allowed ${isUnavailable ? "opacity-45 pointer-events-none" : "active:opacity-75"}`}
      >
        {/* Thumbnail — kit: 68×68, radius 12px, fdf9f3 bg */}
        {product.image_url ? (
          <div className="relative h-[68px] w-[68px] shrink-0 overflow-hidden rounded-[12px] bg-[#fdf9f3]">
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              className="object-cover"
              sizes="68px"
            />
            {isUnavailable && (
              <div className="absolute inset-0 grid place-items-center rounded-[12px] bg-black/50 text-[9px] font-bold uppercase tracking-[0.08em] text-white">
                Indispo.
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-[68px] w-[68px] shrink-0 items-center justify-center rounded-[12px] bg-[#fdf9f3]">
            {isUnavailable ? (
              <span className="text-[9px] font-bold uppercase tracking-wider text-[#a89e94]">Indispo.</span>
            ) : (
              <Plus className="h-5 w-5 text-[#d7352d]/25" />
            )}
          </div>
        )}

        {/* Body */}
        <div className="flex min-w-0 flex-1 flex-col">
          <h3 className={`text-[14px] font-bold leading-tight tracking-[-0.015em] ${isUnavailable ? "text-[#a89e94]" : "text-[#1c1410]"}`}>
            {product.name}
          </h3>
          {product.description && (
            <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-[#68625e]">
              {product.description}
            </p>
          )}
          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <p className={`font-mono text-[13px] font-bold ${isUnavailable ? "text-[#a89e94]" : "text-[#1c1410]"}`}>
                {formatPrice(product.price)}
              </p>
              {product.menu_supplement != null && (
                <span className="rounded-full bg-[#fdebc8] px-1.5 py-0.5 text-[10px] font-semibold text-[#b75000]">
                  Menu +{formatPrice(product.menu_supplement)}
                </span>
              )}
            </div>
            {/* Add button — tomato red circle per kit */}
            {!isUnavailable && (
              <span
                aria-hidden
                className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#d7352d] text-white shadow-[0_0_12px_#d7352d4d] transition-transform group-active:scale-95"
              >
                <Plus className="h-4 w-4" />
              </span>
            )}
          </div>
        </div>
      </button>

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
