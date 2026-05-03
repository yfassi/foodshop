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
        className="relative flex shrink-0 flex-col overflow-hidden rounded-2xl border border-border bg-card text-left transition-colors active:bg-accent/40 disabled:cursor-not-allowed"
        style={{ width: "148px" }}
      >
        {product.image_url ? (
          <div className="relative h-24 w-full">
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              className={`object-cover ${isUnavailable ? "opacity-40 grayscale" : ""}`}
              sizes="148px"
            />
          </div>
        ) : (
          <div className={`flex h-24 w-full items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100 text-3xl ${isUnavailable ? "opacity-40 grayscale" : ""}`}>
            🍽
          </div>
        )}
        <div className="px-3 pb-3 pt-2.5">
          <p className={`truncate text-[13px] font-semibold leading-tight tracking-tight ${isUnavailable ? "text-muted-foreground" : ""}`}>
            {product.name}
          </p>
          {product.description && (
            <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
              {product.description}
            </p>
          )}
          <div className="mt-2 flex items-center justify-between">
            <span className={`font-mono text-[13px] font-bold ${isUnavailable ? "text-muted-foreground" : "text-foreground"}`}>
              {formatPrice(product.price)}
            </span>
            {!isUnavailable && (
              <span
                aria-hidden
                className="grid h-7 w-7 place-items-center rounded-lg bg-primary text-primary-foreground"
              >
                <Plus className="h-4 w-4" />
              </span>
            )}
          </div>
        </div>
        {isUnavailable && (
          <div className="absolute left-2 top-2 rounded-full bg-foreground/80 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-background">
            Indispo.
          </div>
        )}
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
