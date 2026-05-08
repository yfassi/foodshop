"use client";

import { useState } from "react";
import type { ProductWithModifiers } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import { ModifierModal } from "./modifier-modal";
import Image from "next/image";
import { Plus } from "lucide-react";

export function ProductCardSmall({ product }: { product: ProductWithModifiers }) {
  const [showModal, setShowModal] = useState(false);

  const handleClick = () => {
    if (!product.is_available) return;
    setShowModal(true);
  };

  const isUnavailable = !product.is_available;

  return (
    <>
      <button
        onClick={handleClick}
        disabled={isUnavailable}
        className={`relative flex shrink-0 flex-col overflow-hidden rounded-[14px] border border-[#dbd7d2] bg-white text-left transition-colors active:opacity-75 disabled:cursor-not-allowed ${isUnavailable ? "opacity-50" : ""}`}
        style={{ width: "148px" }}
      >
        {/* Thumbnail */}
        {product.image_url ? (
          <div className="relative h-24 w-full">
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              className={`object-cover ${isUnavailable ? "grayscale" : ""}`}
              sizes="148px"
            />
          </div>
        ) : (
          <div className="flex h-24 w-full items-center justify-center bg-gradient-to-br from-[#fdf2e8] to-[#f8e6d3]">
            <Plus className="h-6 w-6 text-[#d7352d]/30" />
          </div>
        )}
        {/* Indispo overlay badge */}
        {isUnavailable && (
          <div className="absolute left-2 top-2 rounded-full bg-[#68625e]/80 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
            Indispo.
          </div>
        )}
        {/* Body */}
        <div className="px-3 pb-3 pt-2.5">
          <p className={`truncate text-[13px] font-bold leading-tight tracking-[-0.015em] ${isUnavailable ? "text-[#a89e94]" : "text-[#1c1410]"}`}>
            {product.name}
          </p>
          {product.description && (
            <p className="mt-0.5 line-clamp-1 text-[11px] text-[#68625e]">
              {product.description}
            </p>
          )}
          <div className="mt-2 flex items-center justify-between">
            <span className={`font-mono text-[13px] font-bold ${isUnavailable ? "text-[#a89e94]" : "text-[#1c1410]"}`}>
              {formatPrice(product.price)}
            </span>
            {!isUnavailable && (
              <span
                aria-hidden
                className="grid h-7 w-7 place-items-center rounded-full bg-[#d7352d] text-white shadow-[0_0_12px_#d7352d4d]"
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
