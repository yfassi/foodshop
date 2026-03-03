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

  return (
    <>
      <button
        onClick={handleClick}
        disabled={!product.is_available}
        className="relative flex shrink-0 flex-col overflow-hidden rounded-xl border border-border bg-card transition-colors active:bg-accent/50 disabled:cursor-not-allowed disabled:opacity-50"
        style={{ width: "140px" }}
      >
        {product.image_url ? (
          <div className="relative h-24 w-full">
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              className="object-cover"
              sizes="140px"
            />
            <div className="absolute bottom-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Plus className="h-3 w-3" />
            </div>
          </div>
        ) : (
          <div className="flex h-24 w-full items-center justify-center bg-muted">
            <Plus className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
        <div className="p-2.5">
          <p className="truncate text-xs font-semibold">{product.name}</p>
          <p className="mt-0.5 text-xs font-bold text-primary">
            {formatPrice(product.price)}
          </p>
        </div>
        {!product.is_available && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-background/80">
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
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
