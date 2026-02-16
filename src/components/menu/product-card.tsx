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

  return (
    <>
      <button
        onClick={handleClick}
        disabled={!product.is_available}
        className="relative flex w-full items-stretch overflow-hidden rounded-xl border border-border bg-card text-left transition-colors active:bg-accent/50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <div className="flex min-w-0 flex-1 flex-col justify-center p-3">
          <h3 className="text-sm font-semibold leading-tight">
            {product.name}
          </h3>
          {product.description && (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {product.description}
            </p>
          )}
          <div className="mt-1.5 flex items-center gap-2">
            <p className="text-sm font-bold text-primary">{formatPrice(product.price)}</p>
            {product.menu_supplement != null && (
              <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                Menu +{formatPrice(product.menu_supplement)}
              </span>
            )}
          </div>
        </div>
        {product.image_url ? (
          <div className="relative m-2 h-20 w-20 shrink-0 overflow-hidden rounded-lg">
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              className="object-cover"
              sizes="80px"
            />
            <div className="absolute bottom-1 right-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Plus className="h-3.5 w-3.5" />
            </div>
          </div>
        ) : (
          <div className="flex shrink-0 items-center pr-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Plus className="h-4 w-4" />
            </div>
          </div>
        )}
        {!product.is_available && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-background/80">
            <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
              Indisponible
            </span>
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
