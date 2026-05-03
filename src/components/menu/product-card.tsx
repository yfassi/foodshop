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
      <button
        onClick={handleClick}
        disabled={isUnavailable}
        className="group relative flex w-full items-start gap-3 rounded-2xl border border-border bg-card p-3 text-left transition-colors active:bg-accent/40 disabled:cursor-not-allowed"
      >
        <div className="flex min-w-0 flex-1 flex-col">
          <h3 className={`text-sm font-semibold leading-tight tracking-tight ${isUnavailable ? "text-muted-foreground" : ""}`}>
            {product.name}
          </h3>
          {product.description && (
            <p className="mt-1 line-clamp-2 text-xs leading-snug text-muted-foreground">
              {product.description}
            </p>
          )}
          <div className="mt-2 flex items-center gap-2">
            <p className={`font-mono text-[13px] font-bold ${isUnavailable ? "text-muted-foreground" : "text-foreground"}`}>
              {formatPrice(product.price)}
            </p>
            {product.menu_supplement != null && (
              <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                Menu +{formatPrice(product.menu_supplement)}
              </span>
            )}
          </div>
        </div>
        {product.image_url ? (
          <div className="relative h-[68px] w-[68px] shrink-0 overflow-hidden rounded-xl">
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              className={`object-cover ${isUnavailable ? "opacity-50" : ""}`}
              sizes="68px"
            />
            {isUnavailable && (
              <div className="absolute inset-0 grid place-items-center bg-foreground/50 text-[9px] font-bold uppercase tracking-wider text-background">
                Indispo.
              </div>
            )}
          </div>
        ) : (
          <div className={`flex h-[68px] w-[68px] shrink-0 items-center justify-center rounded-xl bg-muted text-2xl ${isUnavailable ? "opacity-50" : ""}`}>
            {isUnavailable ? (
              <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Indispo.</span>
            ) : (
              "🍽"
            )}
          </div>
        )}
        {!isUnavailable && (
          <span
            aria-hidden
            className="absolute -bottom-2 right-3 grid h-7 w-7 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm"
          >
            <Plus className="h-4 w-4" />
          </span>
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
